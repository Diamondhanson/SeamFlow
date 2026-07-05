import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { designs, orderPhotos, orders } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type { DesignCreateInput, DesignUpdateInput } from '@seamflow/schemas';

export type DesignRow = typeof designs.$inferSelect;
export type DesignWithUrl = DesignRow & {
  signedUrl?: string;
  thumbnailUrl?: string;
};

const BUCKET = 'designs';
const ORDER_PHOTOS_BUCKET = 'order-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Belt-and-suspenders on top of storage RLS: path must live under the tailor. */
  private assertPathOwnedByTailor(tailorId: string, storagePath: string): void {
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException(
        `storagePath must start with the tailor's id (${tailorId}/...)`,
      );
    }
  }

  async list(tailorId: string): Promise<DesignWithUrl[]> {
    const rows = await this.dbService.db
      .select()
      .from(designs)
      .where(eq(designs.tailorId, tailorId))
      .orderBy(desc(designs.createdAt));
    return Promise.all(rows.map((r) => this.attachSignedUrl(r)));
  }

  async getById(tailorId: string, id: string): Promise<DesignWithUrl> {
    const rows = await this.dbService.db
      .select()
      .from(designs)
      .where(and(eq(designs.tailorId, tailorId), eq(designs.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Design ${id} not found`);
    return this.attachSignedUrl(row);
  }

  async create(tailorId: string, data: DesignCreateInput): Promise<DesignWithUrl> {
    this.assertPathOwnedByTailor(tailorId, data.storagePath);
    if (data.thumbnailPath) this.assertPathOwnedByTailor(tailorId, data.thumbnailPath);

    // Verify the full object actually exists before creating a metadata row.
    const dir = data.storagePath.split('/').slice(0, -1).join('/');
    const file = data.storagePath.split('/').pop();
    const { data: head, error } = await this.supabase
      .admin()
      .storage.from(BUCKET)
      .list(dir, { search: file });
    if (error) {
      this.logger.warn(`Storage list failed: ${error.message}`);
    } else if (!head || head.length === 0) {
      throw new BadRequestException(
        `No object found at ${data.storagePath}. Upload it first.`,
      );
    }

    const [row] = await this.dbService.db
      .insert(designs)
      .values({
        tailorId,
        source: data.source ?? 'uploaded',
        storagePath: data.storagePath,
        thumbnailPath: data.thumbnailPath ?? null,
        contentType: data.contentType ?? null,
        caption: data.caption ?? null,
        tags: data.tags ?? [],
        prompt: data.prompt ?? null,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert returned no row');
    return this.attachSignedUrl(row);
  }

  async update(
    tailorId: string,
    id: string,
    data: DesignUpdateInput,
  ): Promise<DesignWithUrl> {
    await this.getById(tailorId, id);
    const patch: Partial<typeof designs.$inferInsert> = {};
    if (data.caption !== undefined) patch.caption = data.caption;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.aiNotes !== undefined) patch.aiNotes = data.aiNotes;

    const [row] = await this.dbService.db
      .update(designs)
      .set(patch)
      .where(and(eq(designs.tailorId, tailorId), eq(designs.id, id)))
      .returning();
    if (!row) throw new NotFoundException(`Design ${id} not found`);
    return this.attachSignedUrl(row);
  }

  async delete(tailorId: string, id: string): Promise<void> {
    const design = await this.getById(tailorId, id);
    const toRemove = [design.storagePath];
    if (design.thumbnailPath) toRemove.push(design.thumbnailPath);
    const { error } = await this.supabase.admin().storage.from(BUCKET).remove(toRemove);
    if (error) {
      this.logger.error(`Failed to remove ${toRemove.join(', ')}: ${error.message}`);
    }
    await this.dbService.db
      .delete(designs)
      .where(and(eq(designs.tailorId, tailorId), eq(designs.id, id)));
  }

  /**
   * Attach a design to an order (M2). Copies the design's image (full + thumb)
   * from the `designs` bucket into the order's folder in `order-photos`, then
   * registers an order_photos row. The two buckets stay independent — we copy
   * pixels rather than cross-reference storage objects.
   */
  async attachToOrder(
    tailorId: string,
    actorUserId: string,
    designId: string,
    orderId: string,
  ): Promise<{ id: string }> {
    const design = await this.getById(tailorId, designId);

    const ownedOrder = await this.dbService.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, orderId)))
      .limit(1);
    if (!ownedOrder[0]) throw new NotFoundException(`Order ${orderId} not found`);

    const uuid = randomUUID();
    const fullExt = design.storagePath.split('.').pop() ?? 'webp';
    const fullDest = `${tailorId}/${orderId}/${uuid}.${fullExt}`;
    await this.copyObject(design.storagePath, fullDest, design.contentType);

    let thumbDest: string | null = null;
    if (design.thumbnailPath) {
      const thumbExt = design.thumbnailPath.split('.').pop() ?? 'webp';
      thumbDest = `${tailorId}/${orderId}/${uuid}_thumb.${thumbExt}`;
      await this.copyObject(design.thumbnailPath, thumbDest, design.contentType);
    }

    const [row] = await this.dbService.db
      .insert(orderPhotos)
      .values({
        orderId,
        storagePath: fullDest,
        thumbnailPath: thumbDest,
        contentType: design.contentType,
        role: 'reference',
        caption: design.caption,
        uploadedByUserId: actorUserId,
      })
      .returning({ id: orderPhotos.id });
    if (!row) throw new NotFoundException('Attach returned no row');
    return { id: row.id };
  }

  /** Download an object from the designs bucket and re-upload into order-photos. */
  private async copyObject(
    fromPath: string,
    toPath: string,
    contentType: string | null,
  ): Promise<void> {
    const dl = await this.supabase.admin().storage.from(BUCKET).download(fromPath);
    if (dl.error || !dl.data) {
      throw new BadRequestException(
        `Could not read design object ${fromPath}: ${dl.error?.message ?? 'missing'}`,
      );
    }
    const up = await this.supabase
      .admin()
      .storage.from(ORDER_PHOTOS_BUCKET)
      .upload(toPath, dl.data, {
        contentType: contentType ?? 'image/webp',
        upsert: false,
      });
    if (up.error) {
      throw new BadRequestException(`Could not copy into order: ${up.error.message}`);
    }
  }

  async attachSignedUrl(row: DesignRow): Promise<DesignWithUrl> {
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

    const result: DesignWithUrl = { ...row };
    if (fullRes.data?.signedUrl) result.signedUrl = fullRes.data.signedUrl;
    else if (fullRes.error)
      this.logger.warn(`Signed URL failed for ${row.storagePath}: ${fullRes.error.message}`);
    if (thumbRes?.data?.signedUrl) result.thumbnailUrl = thumbRes.data.signedUrl;
    return result;
  }
}
