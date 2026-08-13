import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, lt, or, sql, type SQL } from 'drizzle-orm';
import type {
  FeedPage,
  FeedPost,
  FeedPostCreateInput,
  FeedPostPublic,
  FeedPostUpdateInput,
  FeedQuery,
  TailorMiniProfile,
  TailorProfileUpdateInput,
  TailorPublicProfile,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { feedPosts, orderPhotos, orders, tailors } from '../db/schema';
import { ownerIsLive } from '../common/live-owner';

const ORDER_PHOTOS_BUCKET = 'order-photos';
const FEED_BUCKET = 'feed';
const AVATARS_BUCKET = 'avatars';

/** Row shape returned by the feed queries (post joined to its tailor). */
interface FeedRow {
  post: typeof feedPosts.$inferSelect;
  tailor: typeof tailors.$inferSelect;
}

/**
 * Discovery feed (ROADMAP D.2.1 / D.2.2 / D.5).
 *
 * The load-bearing rule in this file: **private order photos are never
 * referenced by anything public.** Publishing COPIES pixels out of the private
 * `order-photos` bucket into the public `feed` bucket, and only the copies are
 * ever addressed by a feed post. Deleting a post deletes the copies; the
 * original stays put and stays private.
 */
@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  // ── URL helpers ───────────────────────────────────────────────────────────

  /**
   * The `feed` bucket is public, so URLs are stable and need no signing. That's
   * what lets the feed be CDN-cached and rendered by a signed-out visitor.
   */
  private publicUrl(bucket: string, path: string): string {
    return this.supabase.admin().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  private avatarUrl(path: string | null): string | null {
    return path ? this.publicUrl(AVATARS_BUCKET, path) : null;
  }

  // ── Projections ───────────────────────────────────────────────────────────

  /** Public tailor card. Deliberately carries no phone, email, or user id. */
  private toMiniProfile(t: typeof tailors.$inferSelect): TailorMiniProfile {
    return {
      id: t.id,
      businessName: t.businessName,
      city: t.city ?? null,
      // photoUrl is already an absolute public URL (legacy); avatarPath is the
      // newer storefront field. Prefer the explicit storefront avatar.
      avatarUrl: this.avatarUrl(t.avatarPath) ?? t.photoUrl ?? null,
      isVerified: t.isVerified,
      acceptsRemote: t.acceptsRemote,
      responseTimeHours: t.responseTimeHours ?? null,
    };
  }

  private toPublicProfile(t: typeof tailors.$inferSelect): TailorPublicProfile {
    return {
      ...this.toMiniProfile(t),
      bio: t.bio ?? null,
      specialties: (t.specialties as string[]) ?? [],
      languages: (t.languages as string[]) ?? [],
      followerCount: t.followerCount,
      currency: t.currency,
      memberSince: t.createdAt.toISOString(),
    };
  }

  private toPublicPost(row: FeedRow): FeedPostPublic {
    const p = row.post;
    return {
      id: p.id,
      imageUrl: this.publicUrl(FEED_BUCKET, p.publicPath),
      thumbnailUrl: this.publicUrl(FEED_BUCKET, p.publicThumbPath),
      width: p.width ?? null,
      height: p.height ?? null,
      caption: p.caption ?? null,
      garmentType: p.garmentType ?? null,
      tags: (p.tags as string[]) ?? [],
      fabric: p.fabric ?? null,
      startingPrice: p.startingPrice ?? null,
      currency: p.currency ?? null,
      city: p.city ?? null,
      audience: p.audience ?? null,
      occasion: p.occasion ?? null,
      createdAt: p.createdAt.toISOString(),
      tailor: this.toMiniProfile(row.tailor),
    };
  }

  private toOwnerPost(row: FeedRow): FeedPost {
    return {
      ...this.toPublicPost(row),
      tailorId: row.post.tailorId,
      orderPhotoId: row.post.orderPhotoId ?? null,
      status: row.post.status,
      updatedAt: row.post.updatedAt.toISOString(),
    };
  }

  // ── Keyset cursor ─────────────────────────────────────────────────────────
  //
  // Offset pagination on a feed that's actively being published to will skip
  // and repeat posts as you scroll. The cursor encodes the last row's sort key
  // instead, so a page boundary stays put no matter what lands above it.

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor?: string): { createdAt: Date; id: string } | null {
    if (!cursor) return null;
    try {
      const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      if (!iso || !id) return null;
      const createdAt = new Date(iso);
      return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
    } catch {
      return null;
    }
  }

  // ── Public reads ──────────────────────────────────────────────────────────

  async listPublic(query: FeedQuery): Promise<FeedPage> {
    const limit = query.limit ?? 24;
    const conditions: SQL[] = [eq(feedPosts.status, 'published'), ownerIsLive()];

    if (query.garmentType) conditions.push(eq(feedPosts.garmentType, query.garmentType));
    if (query.city) conditions.push(eq(feedPosts.city, query.city));
    if (query.fabric) conditions.push(ilike(feedPosts.fabric, `%${query.fabric}%`));
    if (query.audience) conditions.push(eq(feedPosts.audience, query.audience));
    if (query.occasion) conditions.push(eq(feedPosts.occasion, query.occasion));
    if (query.tailorId) conditions.push(eq(feedPosts.tailorId, query.tailorId));
    if (query.q) {
      const term = `%${query.q}%`;
      const match = or(
        ilike(feedPosts.caption, term),
        ilike(feedPosts.garmentType, term),
        // jsonb tags → text so a plain LIKE reaches inside the array.
        sql`${feedPosts.tags}::text ilike ${term}`,
      );
      if (match) conditions.push(match);
    }

    const cur = this.decodeCursor(query.cursor);
    if (cur) {
      // Strict "older than" on the composite (created_at, id) sort key.
      const keyset = sql`(${feedPosts.createdAt}, ${feedPosts.id}) < (${cur.createdAt.toISOString()}::timestamptz, ${cur.id}::uuid)`;
      conditions.push(keyset);
    }

    // Fetch one extra to learn whether another page exists without a count(*).
    const rows = await this.dbService.db
      .select({ post: feedPosts, tailor: tailors })
      .from(feedPosts)
      .innerJoin(tailors, eq(tailors.id, feedPosts.tailorId))
      .where(and(...conditions))
      .orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((r) => this.toPublicPost(r)),
      nextCursor: hasMore && last ? this.encodeCursor(last.post.createdAt, last.post.id) : null,
    };
  }

  async getPublic(id: string): Promise<{ post: FeedPostPublic; moreLikeThis: FeedPostPublic[] }> {
    const rows = await this.dbService.db
      .select({ post: feedPosts, tailor: tailors })
      .from(feedPosts)
      .innerJoin(tailors, eq(tailors.id, feedPosts.tailorId))
      .where(and(eq(feedPosts.id, id), eq(feedPosts.status, 'published'), ownerIsLive()))
      .limit(1);

    const row = rows[0];
    if (!row) throw new NotFoundException(`Feed post ${id} not found`);

    // `moreLikeThis` stays empty until pgvector similarity lands (C5). Returning
    // the field now means the client can ship its UI without a contract change.
    return { post: this.toPublicPost(row), moreLikeThis: [] };
  }

  async storefront(
    tailorId: string,
    query: FeedQuery,
  ): Promise<{ tailor: TailorPublicProfile; posts: FeedPage }> {
    const found = await this.dbService.db
      .select()
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    const tailor = found[0];
    if (!tailor) throw new NotFoundException(`Tailor ${tailorId} not found`);

    const posts = await this.listPublic({ ...query, tailorId });
    return { tailor: this.toPublicProfile(tailor), posts };
  }

  // ── Publishing ────────────────────────────────────────────────────────────

  /**
   * Copy one object between buckets.
   *
   * supabase-js `.copy()` is same-bucket only, so this is a download →
   * upload round-trip. The images are already compressed (≤2048px WebP, a few
   * hundred KB) so the cost is acceptable for an explicit, one-off action.
   */
  private async copyToFeedBucket(fromPath: string, toPath: string): Promise<void> {
    const storage = this.supabase.admin().storage;
    const { data, error } = await storage.from(ORDER_PHOTOS_BUCKET).download(fromPath);
    if (error || !data) {
      throw new NotFoundException(`Source image not found in storage: ${fromPath}`);
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const { error: upErr } = await storage.from(FEED_BUCKET).upload(toPath, bytes, {
      contentType: data.type || 'image/webp',
      upsert: true,
    });
    if (upErr) throw new Error(`Publish failed (${toPath}): ${upErr.message}`);
  }

  /**
   * Publish a completed order photo to the public feed.
   *
   * DEVIATION from D.5, recorded deliberately: the roadmap calls for copying
   * "the thumbnail + a medium size". We copy the existing thumbnail and the
   * existing full variant instead. The full is already capped at 2048px and a
   * few hundred KB by the client-side pipeline, so a third server-side size
   * would mean adding an image-processing dependency (sharp) to the API for
   * marginal benefit. Revisit if feed payload size becomes a problem.
   */
  async publishOrderPhoto(
    tailorId: string,
    orderPhotoId: string,
    input: FeedPostCreateInput,
  ): Promise<FeedPost> {
    const db = this.dbService.db;

    // Ownership: the photo must belong to an order belonging to this tailor.
    const found = await db
      .select({ photo: orderPhotos, orderTailorId: orders.tailorId })
      .from(orderPhotos)
      .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
      .where(eq(orderPhotos.id, orderPhotoId))
      .limit(1);
    const row = found[0];
    if (!row || row.orderTailorId !== tailorId) {
      throw new NotFoundException(`Order photo ${orderPhotoId} not found`);
    }

    // Already published? Return the existing post rather than duplicating it.
    const existing = await db
      .select({ post: feedPosts, tailor: tailors })
      .from(feedPosts)
      .innerJoin(tailors, eq(tailors.id, feedPosts.tailorId))
      .where(eq(feedPosts.orderPhotoId, orderPhotoId))
      .limit(1);
    if (existing[0]) {
      const post = existing[0];
      if (post.post.status !== 'published') {
        return this.update(tailorId, post.post.id, { ...input, status: 'published' });
      }
      return this.toOwnerPost(post);
    }

    const tailorRows = await db.select().from(tailors).where(eq(tailors.id, tailorId)).limit(1);
    const tailor = tailorRows[0];
    if (!tailor) throw new NotFoundException('Tailor not found');

    const postId = crypto.randomUUID();
    const ext = row.photo.storagePath.split('.').pop() ?? 'webp';
    const publicPath = `${tailorId}/${postId}.${ext}`;
    const publicThumbPath = `${tailorId}/${postId}_thumb.${ext}`;

    await this.copyToFeedBucket(row.photo.storagePath, publicPath);
    // Fall back to the full image if this photo predates thumbnails.
    await this.copyToFeedBucket(row.photo.thumbnailPath ?? row.photo.storagePath, publicThumbPath);

    const inserted = await db
      .insert(feedPosts)
      .values({
        id: postId,
        tailorId,
        orderPhotoId,
        publicPath,
        publicThumbPath,
        caption: input.caption ?? null,
        garmentType: input.garmentType ?? null,
        tags: input.tags ?? [],
        fabric: input.fabric ?? null,
        startingPrice: input.startingPrice ?? null,
        currency: input.currency ?? tailor.currency,
        // Denormalised so the public feed can filter by city without joining.
        city: tailor.city ?? null,
        status: 'published',
      })
      .returning();

    this.logger.log(`Published feed post ${postId} for tailor ${tailorId}`);
    return this.toOwnerPost({ post: inserted[0]!, tailor });
  }

  async listMine(tailorId: string): Promise<FeedPost[]> {
    const rows = await this.dbService.db
      .select({ post: feedPosts, tailor: tailors })
      .from(feedPosts)
      .innerJoin(tailors, eq(tailors.id, feedPosts.tailorId))
      .where(eq(feedPosts.tailorId, tailorId))
      .orderBy(desc(feedPosts.createdAt));
    return rows.map((r) => this.toOwnerPost(r));
  }

  async update(
    tailorId: string,
    id: string,
    input: FeedPostUpdateInput,
  ): Promise<FeedPost> {
    const db = this.dbService.db;
    const owned = await db
      .select()
      .from(feedPosts)
      .where(and(eq(feedPosts.id, id), eq(feedPosts.tailorId, tailorId)))
      .limit(1);
    if (!owned[0]) throw new NotFoundException(`Feed post ${id} not found`);

    const updated = await db
      .update(feedPosts)
      .set({
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.garmentType !== undefined ? { garmentType: input.garmentType } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.fabric !== undefined ? { fabric: input.fabric } : {}),
        ...(input.startingPrice !== undefined ? { startingPrice: input.startingPrice } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(feedPosts.id, id))
      .returning();

    const tailorRows = await db.select().from(tailors).where(eq(tailors.id, tailorId)).limit(1);
    return this.toOwnerPost({ post: updated[0]!, tailor: tailorRows[0]! });
  }

  /** Remove the post AND its public copies. The private original is untouched. */
  async remove(tailorId: string, id: string): Promise<void> {
    const db = this.dbService.db;
    const owned = await db
      .select()
      .from(feedPosts)
      .where(and(eq(feedPosts.id, id), eq(feedPosts.tailorId, tailorId)))
      .limit(1);
    const post = owned[0];
    if (!post) throw new NotFoundException(`Feed post ${id} not found`);

    const { error } = await this.supabase
      .admin()
      .storage.from(FEED_BUCKET)
      .remove([post.publicPath, post.publicThumbPath]);
    if (error) {
      // Orphaned objects in a public bucket are untidy but not a reason to
      // leave a post the tailor asked to delete visible in the feed.
      this.logger.warn(`Feed images for ${id} not removed: ${error.message}`);
    }

    await db.delete(feedPosts).where(eq(feedPosts.id, id));
  }

  // ── Storefront profile ────────────────────────────────────────────────────

  /**
   * Partial update of the tailor's public shop window. `isVerified` and
   * `responseTimeHours` are intentionally not accepted here — see the note on
   * TailorProfileUpdateSchema.
   */
  async updateProfile(tailorId: string, input: TailorProfileUpdateInput) {
    const db = this.dbService.db;
    const updated = await db
      .update(tailors)
      .set({
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
        ...(input.languages !== undefined ? { languages: input.languages } : {}),
        ...(input.avatarPath !== undefined ? { avatarPath: input.avatarPath } : {}),
        ...(input.acceptsRemote !== undefined ? { acceptsRemote: input.acceptsRemote } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tailors.id, tailorId))
      .returning();

    const tailor = updated[0];
    if (!tailor) throw new NotFoundException('Tailor not found');

    // City is denormalised onto posts for the feed filter — keep them in step.
    if (input.city !== undefined) {
      await db
        .update(feedPosts)
        .set({ city: input.city })
        .where(eq(feedPosts.tailorId, tailorId));
    }

    return tailor;
  }
}
