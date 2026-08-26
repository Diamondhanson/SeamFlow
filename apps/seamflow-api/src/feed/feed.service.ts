import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, ilike, lt, or, sql, type SQL } from 'drizzle-orm';
import type {
  CatalogueLink,
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
import {
  catalogueUrl,
  fallbackSlugForId,
  isReservedSlug,
  isValidSlugShape,
  slugifyBusinessName,
  withSlugSuffix,
} from '@seamflow/utils';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { feedPosts, orderPhotos, orders, tailors } from '../db/schema';
import { ownerIsLive } from '../common/live-owner';

const ORDER_PHOTOS_BUCKET = 'order-photos';
const FEED_BUCKET = 'feed';
const AVATARS_BUCKET = 'avatars';

/**
 * How many `-2`, `-3`, … variants to try before giving up on minting a slug.
 *
 * Generous, because the loop only spins when shops genuinely share a name, and
 * a tailor who cannot get an address at all is stuck. It is bounded rather
 * than infinite so a pathological case fails loudly instead of hanging.
 */
const SLUG_MINT_ATTEMPTS = 25;

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

  private readonly webBaseUrl: string;

  constructor(
    config: ConfigService,
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {
    this.webBaseUrl = config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000';
  }

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
      // Null until they first share a catalogue link — see ensureSlug. Present
      // here so a feed item can address its maker's page without another call.
      slug: t.slug ?? null,
      isVerified: t.isVerified,
      acceptsRemote: t.acceptsRemote,
      responseTimeHours: t.responseTimeHours ?? null,
    };
  }

  private toPublicProfile(t: typeof tailors.$inferSelect): TailorPublicProfile {
    return {
      ...this.toMiniProfile(t),
      bio: t.bio ?? null,
      // The opt-in public number, NOT users.phone. Null is both the default
      // and the common case; the catalogue page renders no contact button then.
      whatsapp: t.publicWhatsapp ?? null,
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

    // A slug the tailor typed themselves. Unlike ensureSlug, this must not
    // quietly substitute a variant on collision — someone editing this field
    // has one specific address in mind, and handing back `atelier-ngozi-2`
    // when they asked for `atelier-ngozi` is worse than a plain refusal.
    if (input.slug !== undefined) {
      const slug = input.slug.toLowerCase();
      if (!isValidSlugShape(slug)) {
        throw new ConflictException('That address contains characters we cannot use in a link');
      }
      if (isReservedSlug(slug)) {
        throw new ConflictException('That address is reserved');
      }
      const clash = await db
        .select({ id: tailors.id })
        .from(tailors)
        .where(and(sql`lower(${tailors.slug}) = ${slug}`, sql`${tailors.id} <> ${tailorId}::uuid`))
        .limit(1);
      if (clash[0]) throw new ConflictException('That address is already taken');
    }

    const updated = await db
      .update(tailors)
      .set({
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
        ...(input.languages !== undefined ? { languages: input.languages } : {}),
        ...(input.avatarPath !== undefined ? { avatarPath: input.avatarPath } : {}),
        ...(input.acceptsRemote !== undefined ? { acceptsRemote: input.acceptsRemote } : {}),
        ...(input.slug !== undefined ? { slug: input.slug.toLowerCase() } : {}),
        ...(input.publicWhatsapp !== undefined
          ? { publicWhatsapp: input.publicWhatsapp }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(tailors.id, tailorId))
      .returning()
      .catch((err: unknown) => {
        // The unique index on lower(slug) is the real arbiter — the check
        // above can still lose a race with a concurrent update.
        if (isUniqueViolation(err)) {
          throw new ConflictException('That address is already taken');
        }
        throw err;
      });

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

  // ── Catalogue link (/t/<slug>) ────────────────────────────────────────────

  /**
   * Return this tailor's public address, minting one on first use.
   *
   * Lazy on purpose. Backfilling a slug for every tailor would hand out public
   * addresses to shops that never asked to be findable, and a slug derived
   * from a business name is itself a small disclosure. Creating it at the
   * moment of the first share makes it an act rather than a default.
   *
   * Idempotent: once set, the slug is returned untouched forever. A tailor's
   * address must never change under them — by the time they call this a second
   * time the first one may already be on a signboard.
   */
  async ensureSlug(tailorId: string): Promise<string> {
    const db = this.dbService.db;

    const found = await db
      .select({ id: tailors.id, slug: tailors.slug, businessName: tailors.businessName })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    const tailor = found[0];
    if (!tailor) throw new NotFoundException('Tailor not found');
    if (tailor.slug) return tailor.slug;

    const base = this.slugBaseFor(tailor.businessName, tailor.id);

    // Try the plain slug, then -2, -3, … Each attempt writes and lets the
    // unique index arbitrate rather than pre-checking availability: two
    // tailors sharing for the first time in the same second would both see
    // `atelier-ngozi` as free, and only the write can actually settle it.
    for (let attempt = 0; attempt < SLUG_MINT_ATTEMPTS; attempt++) {
      const candidate = attempt === 0 ? base : withSlugSuffix(base, attempt + 1);
      if (isReservedSlug(candidate)) continue;

      try {
        const updated = await db
          .update(tailors)
          .set({ slug: candidate, updatedAt: new Date() })
          .where(and(eq(tailors.id, tailorId), sql`${tailors.slug} is null`))
          .returning({ slug: tailors.slug });

        const slug = updated[0]?.slug;
        if (slug) return slug;

        // No row updated → someone else set a slug for this tailor between our
        // read and our write. Theirs is now the address; use it.
        const reread = await db
          .select({ slug: tailors.slug })
          .from(tailors)
          .where(eq(tailors.id, tailorId))
          .limit(1);
        if (reread[0]?.slug) return reread[0].slug;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Taken by a different shop — fall through and try the next suffix.
      }
    }

    throw new ConflictException('Could not allocate a catalogue address — please try again');
  }

  /**
   * The starting point for a minted slug.
   *
   * Falls back to `fallbackSlugForId` when the business name yields nothing
   * usable — a shop named entirely in a non-Latin script folds to an empty
   * string, and `/t/` with nothing after it is not a link.
   */
  private slugBaseFor(businessName: string, tailorId: string): string {
    const derived = slugifyBusinessName(businessName ?? '');
    if (isValidSlugShape(derived) && !isReservedSlug(derived)) return derived;
    return fallbackSlugForId(tailorId);
  }

  /**
   * Everything behind POST /me/catalogue-link.
   *
   * `publishedCount` rides along so the app can stop a tailor from sharing a
   * link to an empty page — a first impression that costs nothing to prevent
   * here and cannot be undone once the link is sent.
   */
  async catalogueLink(tailorId: string): Promise<CatalogueLink> {
    const slug = await this.ensureSlug(tailorId);
    const counted = await this.dbService.db
      .select({ n: sql<number>`count(*)::int` })
      .from(feedPosts)
      .where(and(eq(feedPosts.tailorId, tailorId), eq(feedPosts.status, 'published')));

    return {
      url: catalogueUrl(this.webBaseUrl, slug),
      slug,
      publishedCount: counted[0]?.n ?? 0,
    };
  }

  /**
   * Resolve /t/<slug> to a storefront.
   *
   * Matching is on lower(slug) so a link retyped off a shop sign in capitals
   * still lands, and `ownerIsLive()` is applied here — not only in listPublic —
   * so a tailor inside their deletion grace period 404s as a whole page rather
   * than showing an empty but working profile.
   */
  async storefrontBySlug(
    slug: string,
    query: FeedQuery,
  ): Promise<{ tailor: TailorPublicProfile; posts: FeedPage }> {
    const normalised = slug.trim().toLowerCase();
    if (!isValidSlugShape(normalised)) {
      throw new NotFoundException(`No catalogue at /t/${slug}`);
    }

    const found = await this.dbService.db
      .select()
      .from(tailors)
      .where(and(sql`lower(${tailors.slug}) = ${normalised}`, ownerIsLive()))
      .limit(1);

    const tailor = found[0];
    if (!tailor) throw new NotFoundException(`No catalogue at /t/${slug}`);

    const posts = await this.listPublic({ ...query, tailorId: tailor.id });
    return { tailor: this.toPublicProfile(tailor), posts };
  }
}

/**
 * Postgres unique-violation (23505), seen through whatever driver wrapper it
 * arrives in. Narrow on the code rather than the message — the message is
 * localised by the server and names the index, both of which can change.
 */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === '23505') return true;
  const cause = (err as { cause?: unknown }).cause;
  return cause !== undefined && cause !== err && isUniqueViolation(cause);
}
