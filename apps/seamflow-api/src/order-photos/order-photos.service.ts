import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { designs, orderPhotos, orders, tailorWorks } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  AttachLibraryPhotosInput,
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
const DESIGNS_BUCKET = 'designs';
const WORKS_BUCKET = 'works';

/** One image chosen from Design Studio or My Designs, ready to be copied. */
interface LibrarySource {
  bucket: string;
  storagePath: string;
  thumbnailPath: string | null;
  contentType: string | null;
  caption: string | null;
  designId: string | null;
  workId: string | null;
}

/** Keep the copy's extension so Storage serves the right content type. */
function extensionOf(path: string): string {
  const ext = path.split('.').pop();
  return ext && ext.length <= 5 ? ext : 'jpg';
}
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

  // ==========================================================================
  // Attaching from Design Studio / My Designs
  // ==========================================================================

  /**
   * Copy images the tailor already has into an order.
   *
   * A COPY, deliberately, not a reference. An order is a record of a job that
   * has to stay true months later, so a tailor tidying their Design Studio in
   * October must not punch a hole in an order from August. The `source*Id`
   * columns record where it came from and nothing depends on them.
   *
   * The copy happens INSIDE Storage, server-side, so the phone never
   * re-downloads and re-uploads an image the platform already holds. That
   * matters most in the exact moment this feature gets used: standing in front
   * of a client on a bad connection.
   */
  async attachFromLibrary(
    tailorId: string,
    actorUserId: string,
    orderId: string,
    input: AttachLibraryPhotosInput,
  ): Promise<OrderPhotoWithUrl[]> {
    await this.assertOrderOwned(tailorId, orderId);

    const sources = await this.resolveLibrarySources(tailorId, input);
    const role = (input.role ?? 'reference') as OrderPhotoRole;

    const created: OrderPhotoRow[] = [];
    for (const src of sources) {
      const id = randomUUID();
      const ext = extensionOf(src.storagePath);
      const destFull = `${tailorId}/${orderId}/${id}.${ext}`;
      const destThumb = src.thumbnailPath
        ? `${tailorId}/${orderId}/${id}_thumb.${extensionOf(src.thumbnailPath)}`
        : null;

      const copied = await this.copyObject(src.bucket, src.storagePath, destFull);
      if (!copied) continue;

      // A missing thumbnail is not worth failing the attach over — the full
      // image is the thing being attached, and the list view falls back to it.
      let thumbPath: string | null = null;
      if (src.thumbnailPath && destThumb) {
        const ok = await this.copyObject(src.bucket, src.thumbnailPath, destThumb);
        if (ok) thumbPath = destThumb;
      }

      const [row] = await this.dbService.db
        .insert(orderPhotos)
        .values({
          orderId,
          storagePath: destFull,
          thumbnailPath: thumbPath,
          contentType: src.contentType,
          role,
          caption: src.caption,
          uploadedByUserId: actorUserId,
          sourceDesignId: src.designId,
          sourceWorkId: src.workId,
        })
        .returning();
      if (row) created.push(row);
    }

    if (created.length === 0) {
      throw new BadRequestException(
        'Nothing was attached — the selected images could not be copied.',
      );
    }
    return Promise.all(created.map((r) => this.attachSignedUrl(r)));
  }

  /**
   * Look up the chosen designs/works and confirm every one belongs to this
   * tailor.
   *
   * Ownership is checked HERE rather than trusted from the request: the ids
   * arrive from a client, and a copy endpoint that skipped this would let any
   * signed-in tailor pull another tailor's designs into their own order.
   */
  private async resolveLibrarySources(
    tailorId: string,
    input: AttachLibraryPhotosInput,
  ): Promise<LibrarySource[]> {
    const out: LibrarySource[] = [];

    if (input.designIds.length) {
      const rows = await this.dbService.db
        .select()
        .from(designs)
        .where(and(eq(designs.tailorId, tailorId), inArray(designs.id, input.designIds)));
      if (rows.length !== input.designIds.length) {
        throw new NotFoundException('One or more designs were not found');
      }
      for (const d of rows) {
        out.push({
          bucket: DESIGNS_BUCKET,
          storagePath: d.storagePath,
          thumbnailPath: d.thumbnailPath,
          contentType: d.contentType,
          caption: d.caption,
          designId: d.id,
          workId: null,
        });
      }
    }

    if (input.workIds.length) {
      const rows = await this.dbService.db
        .select()
        .from(tailorWorks)
        .where(and(eq(tailorWorks.tailorId, tailorId), inArray(tailorWorks.id, input.workIds)));
      if (rows.length !== input.workIds.length) {
        throw new NotFoundException('One or more works were not found');
      }
      for (const w of rows) {
        out.push({
          // Works record their own bucket: some predate the current layout.
          bucket: w.storageBucket ?? WORKS_BUCKET,
          storagePath: w.storagePath,
          thumbnailPath: w.thumbnailPath,
          contentType: null,
          caption: w.title,
          designId: null,
          workId: w.id,
        });
      }
    }

    return out;
  }

  /**
   * Server-side object copy, across buckets.
   *
   * Returns false rather than throwing so one unreadable image cannot sink an
   * otherwise good multi-select — the caller drops it and attaches the rest.
   */
  private async copyObject(fromBucket: string, from: string, to: string): Promise<boolean> {
    const { error } = await this.supabase
      .admin()
      .storage.from(fromBucket)
      .copy(from, to, { destinationBucket: BUCKET });
    if (error) {
      this.logger.warn(`Copy ${fromBucket}/${from} → ${BUCKET}/${to} failed: ${error.message}`);
      return false;
    }
    return true;
  }
}
