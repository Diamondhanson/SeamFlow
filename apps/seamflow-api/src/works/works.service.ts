import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { MAX_WORK_IMAGES } from '@seamflow/schemas';
import type {
  Work,
  WorkAdoptInput,
  WorkCreateInput,
  WorkImage,
  WorkImageCreateInput,
  WorkFacets,
  WorkPage,
  WorkPublishInput,
  WorkQuery,
  WorkUpdateInput,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  feedPostImages,
  feedPosts,
  orderPhotos,
  orders,
  tailorWorkImages,
  tailorWorks,
  tailors,
} from '../db/schema';

const WORKS_BUCKET = 'works';
const ORDER_PHOTOS_BUCKET = 'order-photos';
const FEED_BUCKET = 'feed';
const SIGNED_URL_TTL_S = 60 * 60;

type WorkRow = typeof tailorWorks.$inferSelect;
type WorkImageRow = typeof tailorWorkImages.$inferSelect;
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
   * one request per bucket, rather than one per image. A design with four
   * angles would otherwise be four round-trips before the grid can paint.
   */
  private async signAll(images: WorkImageRow[]): Promise<Map<string, string>> {
    const byBucket = new Map<string, string[]>();
    for (const img of images) {
      const list = byBucket.get(img.storageBucket) ?? [];
      list.push(img.storagePath);
      if (img.thumbnailPath) list.push(img.thumbnailPath);
      byBucket.set(img.storageBucket, list);
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

  /** Every image of every given design, cover first, grouped by design. */
  private async imagesFor(workIds: string[]): Promise<Map<string, WorkImageRow[]>> {
    const byWork = new Map<string, WorkImageRow[]>();
    if (workIds.length === 0) return byWork;

    const rows = await this.dbService.db
      .select()
      .from(tailorWorkImages)
      .where(inArray(tailorWorkImages.workId, workIds))
      .orderBy(asc(tailorWorkImages.position));

    for (const r of rows) {
      const list = byWork.get(r.workId) ?? [];
      list.push(r);
      byWork.set(r.workId, list);
    }
    return byWork;
  }

  private toWorkImage(img: WorkImageRow, signed: Map<string, string>): WorkImage {
    const key = (p: string) => `${img.storageBucket}:${p}`;
    return {
      id: img.id,
      position: img.position,
      width: img.width ?? null,
      height: img.height ?? null,
      signedUrl: signed.get(key(img.storagePath)),
      thumbnailUrl: img.thumbnailPath ? signed.get(key(img.thumbnailPath)) : undefined,
    };
  }

  private toWork(
    row: WorkRow,
    images: WorkImageRow[],
    signed: Map<string, string>,
    post: FeedPostRow | null,
  ): Work {
    // Designs created before the carousel table existed are backfilled by the
    // migration, so this should never be empty. Synthesising a row from the
    // cover columns anyway means a missed backfill degrades to "one photo"
    // rather than to a design that renders as a blank tile.
    const list = images.length > 0 ? images : [this.coverAsImageRow(row)];

    return {
      id: row.id,
      tailorId: row.tailorId,
      source: row.source,
      width: row.width ?? null,
      height: row.height ?? null,
      orderPhotoId: row.orderPhotoId ?? null,
      orderId: row.orderId ?? null,
      title: row.title ?? null,
      description: row.description ?? null,
      garmentType: row.garmentType ?? null,
      audience: row.audience ?? null,
      fabric: row.fabric ?? null,
      occasion: row.occasion ?? null,
      tags: (row.tags as string[]) ?? [],
      startingPrice: row.startingPrice ?? null,
      currency: row.currency ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      images: list.map((img) => this.toWorkImage(img, signed)),
      // Cover URLs, duplicating images[0] — see the note on WorkSchema.
      signedUrl: signed.get(`${row.storageBucket}:${row.storagePath}`),
      thumbnailUrl: row.thumbnailPath
        ? signed.get(`${row.storageBucket}:${row.thumbnailPath}`)
        : undefined,
      feedPostId: post?.id ?? null,
      isPublished: post?.status === 'published',
    };
  }

  /** The design's cover columns, shaped as if they were an image row. */
  private coverAsImageRow(row: WorkRow): WorkImageRow {
    return {
      id: row.id,
      workId: row.id,
      storageBucket: row.storageBucket,
      storagePath: row.storagePath,
      thumbnailPath: row.thumbnailPath,
      width: row.width,
      height: row.height,
      position: 0,
      createdAt: row.createdAt,
    };
  }

  /**
   * Write the position-0 image back onto the design's cover columns.
   *
   * `tailor_works.storage_path` is a denormalised mirror of the first image,
   * so that any reader wanting one representative picture — the My Designs
   * grid, a signed-URL batch, the publish copy — need not join. This is the
   * only place that invariant is maintained; call it after anything that can
   * change which image is first.
   */
  private async syncCover(workId: string): Promise<void> {
    const first = await this.dbService.db
      .select()
      .from(tailorWorkImages)
      .where(eq(tailorWorkImages.workId, workId))
      .orderBy(asc(tailorWorkImages.position))
      .limit(1);

    const cover = first[0];
    if (!cover) return;

    await this.dbService.db
      .update(tailorWorks)
      .set({
        storageBucket: cover.storageBucket,
        storagePath: cover.storagePath,
        thumbnailPath: cover.thumbnailPath,
        width: cover.width,
        height: cover.height,
        updatedAt: new Date(),
      })
      .where(eq(tailorWorks.id, workId));
  }

  /**
   * Close gaps so positions run 0,1,2,… with no holes.
   *
   * A gap is not cosmetic: the carousel steps by index, so a missing slot
   * would show a blank frame mid-swipe. Deletes are the usual cause.
   *
   * Rewritten in two passes through a temporary negative range, because the
   * unique index on (work_id, position) rejects the intermediate states of a
   * naive single-pass rewrite — shifting 2→1 while 1 still exists collides.
   */
  private async compactPositions(workId: string): Promise<void> {
    const db = this.dbService.db;
    const rows = await db
      .select({ id: tailorWorkImages.id })
      .from(tailorWorkImages)
      .where(eq(tailorWorkImages.workId, workId))
      .orderBy(asc(tailorWorkImages.position));

    for (let i = 0; i < rows.length; i++) {
      await db
        .update(tailorWorkImages)
        .set({ position: -(i + 1) })
        .where(eq(tailorWorkImages.id, rows[i]!.id));
    }
    for (let i = 0; i < rows.length; i++) {
      await db
        .update(tailorWorkImages)
        .set({ position: i })
        .where(eq(tailorWorkImages.id, rows[i]!.id));
    }
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

    // One images query and one signing batch for the whole page, not per row.
    const byWork = await this.imagesFor(page.map((r) => r.work.id));
    const signed = await this.signAll([...byWork.values()].flat());
    const last = page[page.length - 1];

    return {
      items: page.map((r) => this.toWork(r.work, byWork.get(r.work.id) ?? [], signed, r.post)),
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
    const images = (await this.imagesFor([id])).get(id) ?? [];
    const signed = await this.signAll(images.length ? images : [this.coverAsImageRow(row)]);
    return this.toWork(row, images, signed, await this.postFor(id));
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /**
   * Register images the app has already uploaded into the private `works`
   * bucket, as one design.
   *
   * The first entry becomes the cover. One image is the ordinary case; several
   * is a carousel of the same garment from different angles, which is the
   * whole reason this takes a list.
   */
  async create(tailorId: string, input: WorkCreateInput): Promise<Work> {
    // Path ownership: refuse anything not under this tailor's own prefix, so a
    // crafted request can't register someone else's image as its own work.
    // Checked for EVERY image — one bad path in a list of four is still theft.
    for (const img of input.images) {
      if (!img.storagePath.startsWith(`${tailorId}/`)) {
        throw new NotFoundException('Image does not belong to this tailor');
      }
    }

    const cover = input.images[0]!;
    const db = this.dbService.db;

    const inserted = await db
      .insert(tailorWorks)
      .values({
        tailorId,
        source: 'upload',
        // Cover columns mirror images[0] — see syncCover.
        storageBucket: WORKS_BUCKET,
        storagePath: cover.storagePath,
        thumbnailPath: cover.thumbnailPath ?? null,
        width: cover.width ?? null,
        height: cover.height ?? null,
        orderId: input.orderId ?? null,
        title: input.title ?? null,
        description: input.description ?? null,
        garmentType: input.garmentType ?? null,
        audience: input.audience ?? null,
        fabric: input.fabric ?? null,
        occasion: input.occasion ?? null,
        tags: input.tags ?? [],
        startingPrice: input.startingPrice ?? null,
        currency: input.currency ?? null,
      })
      .returning();

    const work = inserted[0]!;
    await db.insert(tailorWorkImages).values(
      input.images.map((img, i) => ({
        workId: work.id,
        storageBucket: WORKS_BUCKET,
        storagePath: img.storagePath,
        thumbnailPath: img.thumbnailPath ?? null,
        width: img.width ?? null,
        height: img.height ?? null,
        position: i,
      })),
    );

    return this.getById(tailorId, work.id);
  }

  // ── Carousel management ───────────────────────────────────────────────────

  /** Add more angles to an existing design. Appended after what is there. */
  async addImages(
    tailorId: string,
    id: string,
    images: WorkImageCreateInput[],
  ): Promise<Work> {
    await this.requireOwned(tailorId, id);
    for (const img of images) {
      if (!img.storagePath.startsWith(`${tailorId}/`)) {
        throw new NotFoundException('Image does not belong to this tailor');
      }
    }

    const db = this.dbService.db;
    const existing = (await this.imagesFor([id])).get(id) ?? [];
    if (existing.length + images.length > MAX_WORK_IMAGES) {
      throw new BadRequestException(
        `A design can hold at most ${MAX_WORK_IMAGES} photos`,
      );
    }

    const start = existing.length;
    await db.insert(tailorWorkImages).values(
      images.map((img, i) => ({
        workId: id,
        storageBucket: WORKS_BUCKET,
        storagePath: img.storagePath,
        thumbnailPath: img.thumbnailPath ?? null,
        width: img.width ?? null,
        height: img.height ?? null,
        position: start + i,
      })),
    );

    // Appending cannot change the cover, but a design whose backfill was
    // missing would have started empty — sync so position 0 is real either way.
    await this.syncCover(id);
    await this.republishIfLive(tailorId, id);
    return this.getById(tailorId, id);
  }

  /**
   * Drop one angle. Refuses to remove the last one — a design with no photo is
   * not a design, and deleting the whole thing is a different, louder action.
   */
  async removeImage(tailorId: string, id: string, imageId: string): Promise<Work> {
    const work = await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    const images = (await this.imagesFor([id])).get(id) ?? [];
    const target = images.find((i) => i.id === imageId);
    if (!target) throw new NotFoundException('Photo not found on this design');
    if (images.length <= 1) {
      throw new BadRequestException('A design must keep at least one photo');
    }

    await db.delete(tailorWorkImages).where(eq(tailorWorkImages.id, imageId));
    await this.compactPositions(id);
    await this.syncCover(id);

    // Only delete pixels we own. An adopted order photo belongs to its order,
    // and removing it here must not take it out of the order's gallery.
    if (work.source === 'upload' && target.storageBucket === WORKS_BUCKET) {
      const paths = [target.storagePath, target.thumbnailPath].filter(Boolean) as string[];
      const { error } = await this.supabase.admin().storage.from(WORKS_BUCKET).remove(paths);
      if (error) this.logger.warn(`Image ${imageId} not removed: ${error.message}`);
    }

    await this.republishIfLive(tailorId, id);
    return this.getById(tailorId, id);
  }

  /** Promote one angle to the cover — what the grid and the feed show. */
  async setCoverImage(tailorId: string, id: string, imageId: string): Promise<Work> {
    await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    const images = (await this.imagesFor([id])).get(id) ?? [];
    if (!images.some((i) => i.id === imageId)) {
      throw new NotFoundException('Photo not found on this design');
    }

    // Reorder in memory, then rewrite through the temporary negative range for
    // the same unique-index reason compactPositions does.
    const reordered = [
      images.find((i) => i.id === imageId)!,
      ...images.filter((i) => i.id !== imageId),
    ];
    for (let i = 0; i < reordered.length; i++) {
      await db
        .update(tailorWorkImages)
        .set({ position: -(i + 1) })
        .where(eq(tailorWorkImages.id, reordered[i]!.id));
    }
    for (let i = 0; i < reordered.length; i++) {
      await db
        .update(tailorWorkImages)
        .set({ position: i })
        .where(eq(tailorWorkImages.id, reordered[i]!.id));
    }

    await this.syncCover(id);
    await this.republishIfLive(tailorId, id);
    return this.getById(tailorId, id);
  }

  /**
   * Re-copy the public images after the carousel changed on a LIVE design.
   *
   * Without this, editing photos on a published piece would leave the public
   * page showing the old set — the tailor would see their change in My Designs
   * and their client would not, which is the worst kind of bug because nobody
   * notices it. Cheap to reason about: tear the public copies down and build
   * them again from the current private set.
   */
  private async republishIfLive(tailorId: string, id: string): Promise<void> {
    const post = await this.postFor(id);
    if (!post || post.status !== 'published') return;
    await this.syncPublicImages(post.id, tailorId, id);
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
        startingPrice: input.startingPrice ?? null,
        currency: input.currency ?? null,
        description: input.description ?? null,
      })
      .returning();

    const work = inserted[0]!;
    // The adopted photo becomes the cover; the tailor can add angles after.
    // Note the bucket: it stays in `order-photos`, not `works` — no copy is
    // made until publish, which is what keeps an unpublished piece private.
    await db.insert(tailorWorkImages).values({
      workId: work.id,
      storageBucket: ORDER_PHOTOS_BUCKET,
      storagePath: row.photo.storagePath,
      thumbnailPath: row.photo.thumbnailPath,
      position: 0,
    });

    return this.getById(tailorId, work.id);
  }

  async update(tailorId: string, id: string, input: WorkUpdateInput): Promise<Work> {
    await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    const updated = await db
      .update(tailorWorks)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.garmentType !== undefined ? { garmentType: input.garmentType } : {}),
        ...(input.audience !== undefined ? { audience: input.audience } : {}),
        ...(input.fabric !== undefined ? { fabric: input.fabric } : {}),
        ...(input.occasion !== undefined ? { occasion: input.occasion } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.startingPrice !== undefined ? { startingPrice: input.startingPrice } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
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
          // Name, note and price are shown on the public catalogue, so an edit
          // here has to reach the live page too — otherwise the tailor fixes a
          // wrong price and their client keeps seeing the old one.
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { caption: input.description } : {}),
          ...(input.startingPrice !== undefined ? { startingPrice: input.startingPrice } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          updatedAt: new Date(),
        })
        .where(eq(feedPosts.id, post.id));
    }

    void updated;
    return this.getById(tailorId, id);
  }

  /** Remove from the portfolio, unpublishing first so no public copy is orphaned. */
  async remove(tailorId: string, id: string): Promise<void> {
    const work = await this.requireOwned(tailorId, id);

    // Read the images BEFORE the delete — the cascade takes the rows with the
    // design, and after that there is nothing left to tell us which objects to
    // clean up, leaving every angle orphaned in the bucket forever.
    const images = (await this.imagesFor([id])).get(id) ?? [];

    await this.unpublish(tailorId, id).catch(() => undefined);
    await this.dbService.db.delete(tailorWorks).where(eq(tailorWorks.id, id));

    // Only delete pixels we own. An adopted order photo belongs to the order,
    // so filter on the bucket rather than on the design's `source`: a design
    // can hold an adopted photo AND angles uploaded afterwards.
    const paths = images
      .filter((i) => i.storageBucket === WORKS_BUCKET)
      .flatMap((i) => [i.storagePath, i.thumbnailPath])
      .filter(Boolean) as string[];

    if (work.source === 'upload' && paths.length === 0) {
      paths.push(...([work.storagePath, work.thumbnailPath].filter(Boolean) as string[]));
    }

    if (paths.length > 0) {
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

  /**
   * Copy the design's current photo set into the public bucket and rewrite the
   * post's image rows to match.
   *
   * Idempotent and destructive-then-rebuild: it removes whatever public copies
   * the post had and lays down a fresh set. That is deliberately simpler than
   * diffing — the sets are at most eight images, and a diff that gets one edge
   * case wrong leaves a public object nobody has a row for.
   */
  private async syncPublicImages(
    postId: string,
    tailorId: string,
    workId: string,
  ): Promise<{ publicPath: string; publicThumbPath: string; width: number | null; height: number | null }> {
    const db = this.dbService.db;

    // Tear down the old public copies first.
    const old = await db
      .select()
      .from(feedPostImages)
      .where(eq(feedPostImages.feedPostId, postId));
    if (old.length > 0) {
      const paths = old.flatMap((i) => [i.publicPath, i.publicThumbPath]);
      const { error } = await this.supabase.admin().storage.from(FEED_BUCKET).remove(paths);
      if (error) this.logger.warn(`Stale public copies for ${postId}: ${error.message}`);
      await db.delete(feedPostImages).where(eq(feedPostImages.feedPostId, postId));
    }

    const images = (await this.imagesFor([workId])).get(workId) ?? [];
    if (images.length === 0) throw new NotFoundException('Design has no photos to publish');

    const rows: (typeof feedPostImages.$inferInsert)[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i]!;
      const ext = img.storagePath.split('.').pop() ?? 'webp';
      const publicPath = `${tailorId}/${postId}_${i}.${ext}`;
      const publicThumbPath = `${tailorId}/${postId}_${i}_thumb.${ext}`;

      await this.copyToFeed(img.storageBucket, img.storagePath, publicPath);
      await this.copyToFeed(
        img.storageBucket,
        img.thumbnailPath ?? img.storagePath,
        publicThumbPath,
      );

      rows.push({
        feedPostId: postId,
        publicPath,
        publicThumbPath,
        width: img.width,
        height: img.height,
        position: i,
      });
    }

    await db.insert(feedPostImages).values(rows);

    const cover = rows[0]!;
    return {
      publicPath: cover.publicPath,
      publicThumbPath: cover.publicThumbPath,
      width: cover.width ?? null,
      height: cover.height ?? null,
    };
  }

  /** Make a portfolio piece public: copy pixels into `feed`, create the post. */
  async publish(tailorId: string, id: string, input: WorkPublishInput): Promise<Work> {
    const work = await this.requireOwned(tailorId, id);
    const db = this.dbService.db;

    // Price, name and note now live on the design. The publish body may still
    // override them, so that a tailor can show the public a different caption
    // than their own notes — but sending nothing publishes what they typed.
    const caption = input.caption ?? work.description ?? work.title ?? null;
    const startingPrice = input.startingPrice ?? work.startingPrice ?? null;

    const existing = await this.postFor(id);
    if (existing) {
      // Already has a post — refresh its images and fields, and flip it live.
      const cover = await this.syncPublicImages(existing.id, tailorId, id);
      await db
        .update(feedPosts)
        .set({
          status: 'published',
          publicPath: cover.publicPath,
          publicThumbPath: cover.publicThumbPath,
          width: cover.width,
          height: cover.height,
          title: work.title ?? null,
          caption,
          startingPrice,
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

    // The post row has to exist before its images can reference it, but its
    // cover columns are only known once the copies are made. Insert with the
    // design's cover, copy, then correct — all three inside one request, so a
    // reader never sees the post without its images.
    await db.insert(feedPosts).values({
      id: postId,
      tailorId,
      workId: work.id,
      orderPhotoId: work.orderPhotoId,
      publicPath: `${tailorId}/${postId}_0.pending`,
      publicThumbPath: `${tailorId}/${postId}_0_thumb.pending`,
      width: work.width,
      height: work.height,
      title: work.title ?? null,
      caption,
      garmentType: work.garmentType,
      audience: work.audience,
      fabric: work.fabric,
      occasion: work.occasion,
      tags: work.tags,
      startingPrice,
      currency: input.currency ?? work.currency ?? tailor.currency,
      city: tailor.city ?? null,
      status: 'published',
    });

    try {
      const cover = await this.syncPublicImages(postId, tailorId, id);
      await db
        .update(feedPosts)
        .set({
          publicPath: cover.publicPath,
          publicThumbPath: cover.publicThumbPath,
          width: cover.width,
          height: cover.height,
          updatedAt: new Date(),
        })
        .where(eq(feedPosts.id, postId));
    } catch (err) {
      // A half-published post would show the feed a `.pending` path that 404s.
      // Roll the row back and let the caller see the real failure.
      await db.delete(feedPosts).where(eq(feedPosts.id, postId));
      throw err;
    }

    this.logger.log(`Published work ${id} as feed post ${postId}`);
    return this.getById(tailorId, id);
  }

  /**
   * Take it back off the feed AND delete the public copies. Leaving the pixels
   * behind would mean an "unpublished" image was still fetchable by URL, which
   * is exactly the thing the private/public split exists to prevent.
   */
  async unpublish(tailorId: string, id: string): Promise<Work> {
    await this.requireOwned(tailorId, id);
    const post = await this.postFor(id);
    if (!post) return this.getById(tailorId, id);

    // Every angle, not just the cover. Read the rows before deleting the post,
    // since the cascade takes them with it.
    const images = await this.dbService.db
      .select()
      .from(feedPostImages)
      .where(eq(feedPostImages.feedPostId, post.id));

    const paths = images.flatMap((i) => [i.publicPath, i.publicThumbPath]);
    // Fall back to the post's own cover columns for a post that predates the
    // images table and somehow escaped the backfill.
    if (paths.length === 0) paths.push(post.publicPath, post.publicThumbPath);

    const { error } = await this.supabase
      .admin()
      .storage.from(FEED_BUCKET)
      .remove(paths);
    if (error) this.logger.warn(`Public copies for ${id} not removed: ${error.message}`);

    await this.dbService.db.delete(feedPosts).where(eq(feedPosts.id, post.id));
    return this.getById(tailorId, id);
  }
}
