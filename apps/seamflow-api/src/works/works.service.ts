import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type {
  Work,
  WorkAdoptInput,
  WorkCreateInput,
  WorkFacets,
  WorkPage,
  WorkPublishInput,
  WorkQuery,
  WorkUpdateInput,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { feedPosts, orderPhotos, orders, tailorWorks, tailors } from '../db/schema';

const WORKS_BUCKET = 'works';
const ORDER_PHOTOS_BUCKET = 'order-photos';
const FEED_BUCKET = 'feed';
const SIGNED_URL_TTL_S = 60 * 60;

type WorkRow = typeof tailorWorks.$inferSelect;
type FeedPostRow = typeof feedPosts.$inferSelect;

/**
 * "My Designs" — the tailor's portfolio of work they actually MADE.
 *
 * The privacy model is the point of this file:
 *
 *   tailor_works  private. Image sits in the `works` bucket (direct upload) or
 *                 is referenced in `order-photos` (adopted from a finished
 *                 order). Served only to its owner, via short-lived signed URLs.
 *   feed_posts    public. Created at publish time from a COPY of the image in
 *                 the public `feed` bucket.
 *
 * An unpublished piece is therefore genuinely unreachable — not merely
 * unlisted. Unpublishing deletes the public copy again.
 */
@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  // ── URL signing ───────────────────────────────────────────────────────────

  /**
   * Sign every private path for a page in as few storage calls as possible —
   * one per bucket, rather than one per image.
   */
  private async signAll(rows: WorkRow[]): Promise<Map<string, string>> {
    const byBucket = new Map<string, string[]>();
    for (const r of rows) {
      const list = byBucket.get(r.storageBucket) ?? [];
      list.push(r.storagePath);
      if (r.thumbnailPath) list.push(r.thumbnailPath);
      byBucket.set(r.storageBucket, list);
    }

    const signed = new Map<string, string>();
    await Promise.all(
      [...byBucket.entries()].map(async ([bucket, paths]) => {
        if (paths.length === 0) return;
        const { data, error } = await this.supabase
          .admin()
          .storage.from(bucket)
          .createSignedUrls([...new Set(paths)], SIGNED_URL_TTL_S);
        if (error || !data) {
          this.logger.warn(`Could not sign ${bucket} paths: ${error?.message}`);
          return;
        }
        for (const e of data) {
          if (e.path && e.signedUrl) signed.set(`${bucket}:${e.path}`, e.signedUrl);
        }
      }),
    );
    return signed;
  }

  private toWork(
    row: WorkRow,
    signed: Map<string, string>,
    post: FeedPostRow | null,
  ): Work {
    const key = (p: string) => `${row.storageBucket}:${p}`;
    return {
      id: row.id,
      tailorId: row.tailorId,
      source: row.source,
      width: row.width ?? null,
      height: row.height ?? null,
      orderPhotoId: row.orderPhotoId ?? null,
      orderId: row.orderId ?? null,
      title: row.title ?? null,
      garmentType: row.garmentType ?? null,
      audience: row.audience ?? null,
      fabric: row.fabric ?? null,
      occasion: row.occasion ?? null,
      tags: (row.tags as string[]) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      signedUrl: signed.get(key(row.storagePath)),
      thumbnailUrl: row.thumbnailPath ? signed.get(key(row.thumbnailPath)) : undefined,
      feedPostId: post?.id ?? null,
      isPublished: post?.status === 'published',
    };
  }

  // ── Cursor ────────────────────────────────────────────────────────────────

  private encodeCursor(at: Date, id: string): string {
    return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor?: string): { at: Date; id: string } | null {
    if (!cursor) return null;
    try {
      const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      if (!iso || !id) return null;
      const at = new Date(iso);
      return Number.isNaN(at.getTime()) ? null : { at, id };
    } catch {
      return null;
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async list(tailorId: string, query: WorkQuery): Promise<WorkPage> {
    const db = this.dbService.db;
    const limit = query.limit ?? 30;
    const conditions: SQL[] = [eq(tailorWorks.tailorId, tailorId)];

    if (query.garmentType) conditions.push(eq(tailorWorks.garmentType, query.garmentType));
    if (query.audience) conditions.push(eq(tailorWorks.audience, query.audience));
    if (query.occasion) conditions.push(eq(tailorWorks.occasion, query.occasion));
    if (query.fabric) conditions.push(ilike(tailorWorks.fabric, `%${query.fabric}%`));
    if (query.q) {
      const term = `%${query.q}%`;
      const match = or(
        ilike(tailorWorks.title, term),
        ilike(tailorWorks.garmentType, term),
        sql`${tailorWorks.tags}::text ilike ${term}`,
      );
      if (match) conditions.push(match);
    }

    const cur = this.decodeCursor(query.cursor);
    if (cur) {
      conditions.push(
        sql`(${tailorWorks.createdAt}, ${tailorWorks.id}) < (${cur.at.toISOString()}::timestamptz, ${cur.id}::uuid)`,
      );
    }

    // Left-join the public post so one query answers "is this live?" too.
    const rows = await db
      .select({ work: tailorWorks, post: feedPosts })
      .from(tailorWorks)
      .leftJoin(feedPosts, eq(feedPosts.workId, tailorWorks.id))
      .where(and(...conditions))
      .orderBy(desc(tailorWorks.createdAt), desc(tailorWorks.id))
      .limit(limit + 1);

    // The published/unpublished filter has to run after the join.
    const filtered =
      query.published === 'published'
        ? rows.filter((r) => r.post?.status === 'published')
        : query.published === 'unpublished'
          ? rows.filter((r) => r.post?.status !== 'published')
          : rows;

    const hasMore = filtered.length > limit;
    const page = hasMore ? filtered.slice(0, limit) : filtered;
    const signed = await this.signAll(page.map((r) => r.work));
    const last = page[page.length - 1];

    return {
      items: page.map((r) => this.toWork(r.work, signed, r.post)),
      nextCursor:
        hasMore && last ? this.encodeCursor(last.work.createdAt, last.work.id) : null,
    };
  }

  /**
   * Distinct values actually present in this tailor's portfolio. The filter bar
   * renders from this so it never offers a chip that leads to an empty grid.
   */
  async facets(tailorId: string): Promise<WorkFacets> {
    const db = this.dbService.db;
    const rows = await db
      .select({ work: tailorWorks, post: feedPosts })
      .from(tailorWorks)
      .leftJoin(feedPosts, eq(feedPosts.workId, tailorWorks.id))
      .where(eq(tailorWorks.tailorId, tailorId));

    const uniq = <T>(xs: (T | null | undefined)[]): T[] =>
      [...new Set(xs.filter((x): x is T => x != null && x !== ''))].sort();

    return {
      garmentTypes: uniq(rows.map((r) => r.work.garmentType)),
      fabrics: uniq(rows.map((r) => r.work.fabric)),
      audiences: uniq(rows.map((r) => r.work.audience)),
      occasions: uniq(rows.map((r) => r.work.occasion)),
      total: rows.length,
      publishedCount: rows.filter((r) => r.post?.status === 'published').length,
    };
  }

  private async requireOwned(tailorId: string, id: string): Promise<WorkRow> {
    const rows = await this.dbService.db
      .select()
      .from(tailorWorks)
      .where(and(eq(tailorWorks.id, id), eq(tailorWorks.tailorId, tailorId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Design ${id} not found`);
    return row;
  }

  private async postFor(workId: string): Promise<FeedPostRow | null> {
    const rows = await this.dbService.db
      .select()
      .from(feedPosts)
      .where(eq(feedPosts.workId, workId))
      .limit(1);
    return rows[0] ?? null;
  }

  async getById(tailorId: string, id: string): Promise<Work> {
    const row = await this.requireOwned(tailorId, id);
    const signed = await this.signAll([row]);
    return this.toWork(row, signed, await this.postFor(id));
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /** Register an image the app has already uploaded into the private `works` bucket. */
  async create(tailorId: string, input: WorkCreateInput): Promise<Work> {
    // Path ownership: refuse anything not under this tailor's own prefix, so a
    // crafted request can't register someone else's image as its own work.
    if (!input.storagePath.startsWith(`${tailorId}/`)) {
      throw new NotFoundException('Image does not belong to this tailor');
    }

    const inserted = await this.dbService.db
      .insert(tailorWorks)
      .values({
        tailorId,
        source: 'upload',
        storageBucket: WORKS_BUCKET,
        storagePath: input.storagePath,
        thumbnailPath: input.thumbnailPath ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        orderId: input.orderId ?? null,
        title: input.title ?? null,
        garmentType: input.garmentType ?? null,
        audience: input.audience ?? null,
        fabric: input.fabric ?? null,
        occasion: input.occasion ?? null,
        tags: input.tags ?? [],
      })
      .returning();

    const signed = await this.signAll([inserted[0]!]);
    return this.toWork(inserted[0]!, signed, null);
  }

  /**
   * Pull a finished order's photo into the portfolio.
   *
   * This is the rerouting that keeps "one unified portfolio" true: publishing
   * from an order no longer writes straight to feed_posts, it adopts the photo
   * as a work first. Idempotent — adopting twice returns the existing entry,
   * which is also what the unique index on order_photo_id enforces.
   */
  async adoptOrderPhoto(
    tailorId: string,
    orderPhotoId: string,
    input: WorkAdoptInput,
  ): Promise<Work> {
    const db = this.dbService.db;

    const found = await db
      .select({ photo: orderPhotos, orderTailorId: orders.tailorId, orderId: orders.id })
      .from(orderPhotos)
      .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
      .where(eq(orderPhotos.id, orderPhotoId))
      .limit(1);
    const row = found[0];
    if (!row || row.orderTailorId !== tailorId) {
      throw new NotFoundException(`Order photo ${orderPhotoId} not found`);
    }

    const existing = await db
      .select()
      .from(tailorWorks)
      .where(eq(tailorWorks.orderPhotoId, orderPhotoId))
      .limit(1);
    if (existing[0]) {
      const updated = await this.update(tailorId, existing[0].id, input);
      return updated;
    }

    const inserted = await db
      .insert(tailorWorks)
      .values({
        tailorId,
        source: 'order_photo',
        // The image stays where it is — in the private order-photos bucket. No
        // copy is made until the tailor actually publishes.
        storageBucket: ORDER_PHOTOS_BUCKET,
        storagePath: row.photo.storagePath,
        thumbnailPath: row.photo.thumbnailPath,
        orderPhotoId,
        orderId: row.orderId,
        title: input.title ?? null,
        garmentType: input.garmentType ?? null,
        audience: input.audience ?? null,
        fabric: input.fabric ?? null,
        occasion: input.occasion ?? null,
        tags: input.tags ?? [],
      })
      .returning();

    const signed = await this.signAll([inserted[0]!]);
    return this.toWork(inserted[0]!, signed, null);
  }

  async update(tailorId: string, id: string, input: WorkUpdateInput): Promise<Work> {
    await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    const updated = await db
      .update(tailorWorks)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.garmentType !== undefined ? { garmentType: input.garmentType } : {}),
        ...(input.audience !== undefined ? { audience: input.audience } : {}),
        ...(input.fabric !== undefined ? { fabric: input.fabric } : {}),
        ...(input.occasion !== undefined ? { occasion: input.occasion } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tailorWorks.id, id))
      .returning();

    // Attributes are denormalised onto the public post for feed filtering —
    // keep them in step or the public feed will filter on stale values.
    const post = await this.postFor(id);
    if (post) {
      await db
        .update(feedPosts)
        .set({
          ...(input.garmentType !== undefined ? { garmentType: input.garmentType } : {}),
          ...(input.audience !== undefined ? { audience: input.audience } : {}),
          ...(input.fabric !== undefined ? { fabric: input.fabric } : {}),
          ...(input.occasion !== undefined ? { occasion: input.occasion } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          updatedAt: new Date(),
        })
        .where(eq(feedPosts.id, post.id));
    }

    const signed = await this.signAll([updated[0]!]);
    return this.toWork(updated[0]!, signed, await this.postFor(id));
  }

  /** Remove from the portfolio, unpublishing first so no public copy is orphaned. */
  async remove(tailorId: string, id: string): Promise<void> {
    const work = await this.requireOwned(tailorId, id);
    await this.unpublish(tailorId, id).catch(() => undefined);
    await this.dbService.db.delete(tailorWorks).where(eq(tailorWorks.id, id));

    // Only delete pixels we own. An adopted order photo belongs to the order.
    if (work.source === 'upload') {
      const paths = [work.storagePath, work.thumbnailPath].filter(Boolean) as string[];
      const { error } = await this.supabase.admin().storage.from(WORKS_BUCKET).remove(paths);
      if (error) this.logger.warn(`Work images for ${id} not removed: ${error.message}`);
    }
  }

  // ── Publish / unpublish ───────────────────────────────────────────────────

  private async copyToFeed(
    fromBucket: string,
    fromPath: string,
    toPath: string,
  ): Promise<void> {
    const storage = this.supabase.admin().storage;
    const { data, error } = await storage.from(fromBucket).download(fromPath);
    if (error || !data) {
      throw new NotFoundException(`Source image not found: ${fromBucket}/${fromPath}`);
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const { error: upErr } = await storage.from(FEED_BUCKET).upload(toPath, bytes, {
      contentType: data.type || 'image/webp',
      upsert: true,
    });
    if (upErr) throw new Error(`Publish failed (${toPath}): ${upErr.message}`);
  }

  /** Make a portfolio piece public: copy pixels into `feed`, create the post. */
  async publish(tailorId: string, id: string, input: WorkPublishInput): Promise<Work> {
    const work = await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    const existing = await this.postFor(id);
    if (existing) {
      // Already has a post — just flip it live again and refresh its fields.
      await db
        .update(feedPosts)
        .set({
          status: 'published',
          ...(input.caption !== undefined ? { caption: input.caption } : {}),
          ...(input.startingPrice !== undefined ? { startingPrice: input.startingPrice } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          updatedAt: new Date(),
        })
        .where(eq(feedPosts.id, existing.id));
      return this.getById(tailorId, id);
    }

    const tailorRows = await db.select().from(tailors).where(eq(tailors.id, tailorId)).limit(1);
    const tailor = tailorRows[0];
    if (!tailor) throw new NotFoundException('Tailor not found');

    const postId = crypto.randomUUID();
    const ext = work.storagePath.split('.').pop() ?? 'webp';
    const publicPath = `${tailorId}/${postId}.${ext}`;
    const publicThumbPath = `${tailorId}/${postId}_thumb.${ext}`;

    await this.copyToFeed(work.storageBucket, work.storagePath, publicPath);
    await this.copyToFeed(
      work.storageBucket,
      work.thumbnailPath ?? work.storagePath,
      publicThumbPath,
    );

    await db.insert(feedPosts).values({
      id: postId,
      tailorId,
      workId: work.id,
      orderPhotoId: work.orderPhotoId,
      publicPath,
      publicThumbPath,
      width: work.width,
      height: work.height,
      caption: input.caption ?? work.title ?? null,
      garmentType: work.garmentType,
      audience: work.audience,
      fabric: work.fabric,
      occasion: work.occasion,
      tags: work.tags,
      startingPrice: input.startingPrice ?? null,
      currency: input.currency ?? tailor.currency,
      city: tailor.city ?? null,
      status: 'published',
    });

    this.logger.log(`Published work ${id} as feed post ${postId}`);
    return this.getById(tailorId, id);
  }

  /**
   * Take it back off the feed AND delete the public copy. Leaving the pixels
   * behind would mean an "unpublished" image was still fetchable by URL, which
   * is exactly the thing the private/public split exists to prevent.
   */
  async unpublish(tailorId: string, id: string): Promise<Work> {
    await this.requireOwned(tailorId, id);
    const post = await this.postFor(id);
    if (!post) return this.getById(tailorId, id);

    const { error } = await this.supabase
      .admin()
      .storage.from(FEED_BUCKET)
      .remove([post.publicPath, post.publicThumbPath]);
    if (error) this.logger.warn(`Public copies for ${id} not removed: ${error.message}`);

    await this.dbService.db.delete(feedPosts).where(eq(feedPosts.id, post.id));
    return this.getById(tailorId, id);
  }
}
