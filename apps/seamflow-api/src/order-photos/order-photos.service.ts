import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { orderPhotos, orders } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  OrderPhotoCreateInput,
  OrderPhotoRole,
  OrderPhotoUpdateInput,
} from '@seamflow/schemas';

export type OrderPhotoRow = typeof orderPhotos.$inferSelect;
export type OrderPhotoWithUrl = OrderPhotoRow & {
  signedUrl?: string;
  thumbnailUrl?: string;
};

const BUCKET = 'order-photos';
/** TTL for signed download URLs returned to clients. */
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class OrderPhotosService {
  private readonly logger = new Logger(OrderPhotosService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Verify the order belongs to this tailor. */
  private async assertOrderOwned(tailorId: string, orderId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, orderId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Order ${orderId} not found`);
  }

  /**
   * Validate that the storagePath starts with the tailor's id folder.
   * The mobile uploads with the user's JWT under this convention; this is
   * server-side belt-and-suspenders — even though storage RLS already enforces
   * this, we want our own DB row to be consistent.
   */
  private assertPathOwnedByTailor(tailorId: string, storagePath: string): void {
    const firstSegment = storagePath.split('/')[0];
    if (firstSegment !== tailorId) {
      throw new BadRequestException(
        `storagePath must start with the tailor's id (${tailorId}/...)`,
      );
    }
  }

  async listForOrder(tailorId: string, orderId: string): Promise<OrderPhotoWithUrl[]> {
    await this.assertOrderOwned(tailorId, orderId);
    const rows = await this.dbService.db
      .select()
      .from(orderPhotos)
      .where(eq(orderPhotos.orderId, orderId))
      .orderBy(desc(orderPhotos.createdAt));

    return Promise.all(rows.map((r) => this.attachSignedUrl(r)));
  }

  async getById(tailorId: string, id: string): Promise<OrderPhotoWithUrl> {
    const rows = await this.dbService.db
      .select({ photo: orderPhotos, orderTailorId: orders.tailorId })
      .from(orderPhotos)
      .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
      .where(eq(orderPhotos.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.orderTailorId !== tailorId) {
      throw new NotFoundException(`Order photo ${id} not found`);
    }
    return this.attachSignedUrl(row.photo);
  }

  async createForOrder(
    tailorId: string,
    actorUserId: string,
    orderId: string,
    data: OrderPhotoCreateInput,
  ): Promise<OrderPhotoWithUrl> {
    await this.assertOrderOwned(tailorId, orderId);
    this.assertPathOwnedByTailor(tailorId, data.storagePath);
    if (data.thumbnailPath) {
      this.assertPathOwnedByTailor(tailorId, data.thumbnailPath);
    }

    // Verify the full object actually exists in Storage. Without this an empty
    // metadata row could be created against nothing.
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
      .insert(orderPhotos)
      .values({
        orderId,
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
    data: OrderPhotoUpdateInput,
  ): Promise<OrderPhotoWithUrl> {
    await this.getById(tailorId, id);
    const patch: Partial<typeof orderPhotos.$inferInsert> = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.caption !== undefined) patch.caption = data.caption;

    const [row] = await this.dbService.db
      .update(orderPhotos)
      .set(patch)
      .where(eq(orderPhotos.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Order photo ${id} not found`);
    return this.attachSignedUrl(row);
  }

  /** Removes BOTH storage objects (full + thumb if present) AND the metadata row. */
  async delete(tailorId: string, id: string): Promise<void> {
    const photo = await this.getById(tailorId, id);

    const toRemove = [photo.storagePath];
    if (photo.thumbnailPath) toRemove.push(photo.thumbnailPath);

    const { error } = await this.supabase
      .admin()
      .storage.from(BUCKET)
      .remove(toRemove);
    if (error) {
      // Log but don't fail — the DB row should still go away even if the
      // pixels are stuck.
      this.logger.error(
        `Failed to remove storage objects ${toRemove.join(', ')}: ${error.message}`,
      );
    }

    await this.dbService.db.delete(orderPhotos).where(eq(orderPhotos.id, id));
  }

  /**
   * Attach signed URLs (full + thumb) to a photo row. Public because the
   * share-link path needs to call this from a non-authed context.
   */
  async attachSignedUrl(row: OrderPhotoRow): Promise<OrderPhotoWithUrl> {
    // Generate both signed URLs in parallel.
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

    const result: OrderPhotoWithUrl = { ...row };
    if (fullRes.data?.signedUrl) {
      result.signedUrl = fullRes.data.signedUrl;
    } else if (fullRes.error) {
      this.logger.warn(`Signed URL failed for ${row.storagePath}: ${fullRes.error.message}`);
    }
    if (thumbRes?.data?.signedUrl) {
      result.thumbnailUrl = thumbRes.data.signedUrl;
    } else if (thumbRes?.error) {
      this.logger.warn(
        `Thumb signed URL failed for ${row.thumbnailPath}: ${thumbRes.error.message}`,
      );
    }
    return result;
  }
}
