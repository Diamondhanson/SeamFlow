import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { groupOrderPhotos, groupOrders } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  GroupOrderPhotoCreateInput,
  GroupOrderPhotoUpdateInput,
  OrderPhotoRole,
} from '@seamflow/schemas';

export type GroupOrderPhotoRow = typeof groupOrderPhotos.$inferSelect;
export type GroupOrderPhotoWithUrl = GroupOrderPhotoRow & {
  signedUrl?: string;
  thumbnailUrl?: string;
};

// Group photos live in the SAME bucket as order photos, just under a
// <tailorId>/groups/<groupId>/... path.
const BUCKET = 'order-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class GroupOrderPhotosService {
  private readonly logger = new Logger(GroupOrderPhotosService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Verify the group order belongs to this tailor. */
  private async assertGroupOwned(tailorId: string, groupOrderId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: groupOrders.id, tailorId: groupOrders.tailorId })
      .from(groupOrders)
      .where(eq(groupOrders.id, groupOrderId))
      .limit(1);
    if (!rows[0] || rows[0].tailorId !== tailorId) {
      throw new NotFoundException(`Group order ${groupOrderId} not found`);
    }
  }

  private assertPathOwnedByTailor(tailorId: string, storagePath: string): void {
    const firstSegment = storagePath.split('/')[0];
    if (firstSegment !== tailorId) {
      throw new BadRequestException(
        `storagePath must start with the tailor's id (${tailorId}/...)`,
      );
    }
  }

  async listForGroup(
    tailorId: string,
    groupOrderId: string,
  ): Promise<GroupOrderPhotoWithUrl[]> {
    await this.assertGroupOwned(tailorId, groupOrderId);
    const rows = await this.dbService.db
      .select()
      .from(groupOrderPhotos)
      .where(eq(groupOrderPhotos.groupOrderId, groupOrderId))
      .orderBy(desc(groupOrderPhotos.createdAt));
    return Promise.all(rows.map((r) => this.attachSignedUrl(r)));
  }

  async getById(tailorId: string, id: string): Promise<GroupOrderPhotoWithUrl> {
    const rows = await this.dbService.db
      .select({ photo: groupOrderPhotos, groupTailorId: groupOrders.tailorId })
      .from(groupOrderPhotos)
      .innerJoin(groupOrders, eq(groupOrders.id, groupOrderPhotos.groupOrderId))
      .where(eq(groupOrderPhotos.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.groupTailorId !== tailorId) {
      throw new NotFoundException(`Group order photo ${id} not found`);
    }
    return this.attachSignedUrl(row.photo);
  }

  async createForGroup(
    tailorId: string,
    actorUserId: string,
    groupOrderId: string,
    data: GroupOrderPhotoCreateInput,
  ): Promise<GroupOrderPhotoWithUrl> {
    await this.assertGroupOwned(tailorId, groupOrderId);
    this.assertPathOwnedByTailor(tailorId, data.storagePath);
    if (data.thumbnailPath) {
      this.assertPathOwnedByTailor(tailorId, data.thumbnailPath);
    }

    // Verify the full object actually exists in Storage before recording it.
    const { data: head, error } = await this.supabase
      .admin()
      .storage.from(BUCKET)
      .list(data.storagePath.split('/').slice(0, -1).join('/'), {
        search: data.storagePath.split('/').pop(),
      });
    if (error) {
      this.logger.warn(`Storage list failed: ${error.message}`);
    } else if (!head || head.length === 0) {
      throw new BadRequestException(
        `No object found at ${data.storagePath}. Upload it first.`,
      );
    }

    const [row] = await this.dbService.db
      .insert(groupOrderPhotos)
      .values({
        groupOrderId,
        storagePath: data.storagePath,
        thumbnailPath: data.thumbnailPath ?? null,
        contentType: data.contentType ?? null,
        role: (data.role ?? 'reference') as OrderPhotoRole,
        caption: data.caption ?? null,
        uploadedByUserId: actorUserId,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert returned no row');
    return this.attachSignedUrl(row);
  }

  async update(
    tailorId: string,
    id: string,
    data: GroupOrderPhotoUpdateInput,
  ): Promise<GroupOrderPhotoWithUrl> {
    await this.getById(tailorId, id);
    const patch: Partial<typeof groupOrderPhotos.$inferInsert> = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.caption !== undefined) patch.caption = data.caption;

    const [row] = await this.dbService.db
      .update(groupOrderPhotos)
      .set(patch)
      .where(eq(groupOrderPhotos.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Group order photo ${id} not found`);
    return this.attachSignedUrl(row);
  }

  async delete(tailorId: string, id: string): Promise<void> {
    const photo = await this.getById(tailorId, id);
    const toRemove = [photo.storagePath];
    if (photo.thumbnailPath) toRemove.push(photo.thumbnailPath);

    const { error } = await this.supabase.admin().storage.from(BUCKET).remove(toRemove);
    if (error) {
      this.logger.error(
        `Failed to remove storage objects ${toRemove.join(', ')}: ${error.message}`,
      );
    }
    await this.dbService.db.delete(groupOrderPhotos).where(eq(groupOrderPhotos.id, id));
  }

  async attachSignedUrl(row: GroupOrderPhotoRow): Promise<GroupOrderPhotoWithUrl> {
    const [fullRes, thumbRes] = await Promise.all([
      this.supabase
        .admin()
        .storage.from(BUCKET)
        .createSignedUrl(row.storagePath, SIGNED_URL_TTL_SECONDS),
      row.thumbnailPath
        ? this.supabase
            .admin()
            .storage.from(BUCKET)
            .createSignedUrl(row.thumbnailPath, SIGNED_URL_TTL_SECONDS)
        : Promise.resolve(null),
    ]);

    const result: GroupOrderPhotoWithUrl = { ...row };
    if (fullRes.data?.signedUrl) result.signedUrl = fullRes.data.signedUrl;
    else if (fullRes.error)
      this.logger.warn(`Signed URL failed for ${row.storagePath}: ${fullRes.error.message}`);
    if (thumbRes?.data?.signedUrl) result.thumbnailUrl = thumbRes.data.signedUrl;
    else if (thumbRes?.error)
      this.logger.warn(
        `Thumb signed URL failed for ${row.thumbnailPath}: ${thumbRes.error.message}`,
      );
    return result;
  }
}
