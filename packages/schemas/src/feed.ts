import { z } from 'zod';
import { TailorMiniProfileSchema } from './tailor-profile';
import { WorkAudienceSchema, WorkOccasionSchema } from './work';

// ============================================================================
// Discovery feed (ROADMAP D.1.1 / D.2.1).
//
// A feed post is a tailor-approved showcase image derived from a completed
// order photo. The images referenced here live in the PUBLIC `feed` bucket —
// derivatives copied at publish time. The private order-photo original is
// never referenced by anything public (D.5).
//
// Note the URL shape differs from designs/order-photos: those carry
// short-lived `signedUrl`s, these carry stable public URLs. No per-request
// signing means the feed can be CDN-cached and rendered signed-out.
// ============================================================================

export const FeedPostStatusSchema = z.enum(['published', 'hidden', 'removed']);
export type FeedPostStatus = z.infer<typeof FeedPostStatusSchema>;

/** Fields a tailor supplies (or edits) about their published work. */
const feedPostMeta = {
  caption: z.string().max(280).nullable().optional(),
  garmentType: z.string().max(60).nullable().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  fabric: z.string().max(80).nullable().optional(),
  /** Optional "from" price. String to preserve decimal precision over the wire. */
  startingPrice: z.string().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  audience: WorkAudienceSchema.nullable().optional(),
  occasion: WorkOccasionSchema.nullable().optional(),
};

/**
 * One public photo of a design. The `feed` bucket is public, so these are
 * plain stable URLs — no signing, which is what lets the feed be CDN-cached
 * and rendered for a signed-out visitor.
 */
export const FeedImageSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  /** 0 is the cover. */
  position: z.number().int().nonnegative(),
});
export type FeedImage = z.infer<typeof FeedImageSchema>;

/**
 * The public projection — what anyone browsing the feed receives.
 * `width`/`height` let a masonry grid reserve space before the image loads.
 */
export const FeedPostPublicSchema = z.object({
  id: z.string().uuid(),
  /**
   * Cover image, duplicating `images[0]`.
   *
   * Kept alongside the array so a feed thumbnail never has to index into it,
   * and so every client written before carousels existed keeps working. A
   * one-photo design is the common case and this is all it needs.
   */
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  /**
   * Every angle of this design, cover first. Always at least one entry, so a
   * caller can render `images` alone and ignore the cover fields entirely.
   */
  images: z.array(FeedImageSchema),
  /** Short name of the design, if the tailor gave it one. */
  title: z.string().nullable(),
  caption: z.string().nullable(),
  garmentType: z.string().nullable(),
  tags: z.array(z.string()),
  fabric: z.string().nullable(),
  startingPrice: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  city: z.string().nullable(),
  audience: WorkAudienceSchema.nullable(),
  occasion: WorkOccasionSchema.nullable(),
  createdAt: z.string().datetime(),
  tailor: TailorMiniProfileSchema,
});
export type FeedPostPublic = z.infer<typeof FeedPostPublicSchema>;

/** The owner's view — adds status and the source photo, for the manage screen. */
export const FeedPostSchema = FeedPostPublicSchema.extend({
  tailorId: z.string().uuid(),
  orderPhotoId: z.string().uuid().nullable(),
  status: FeedPostStatusSchema,
  updatedAt: z.string().datetime(),
});
export type FeedPost = z.infer<typeof FeedPostSchema>;

/** Body for POST /order-photos/:id/publish. */
export const FeedPostCreateSchema = z.object(feedPostMeta);
export type FeedPostCreateInput = z.infer<typeof FeedPostCreateSchema>;

/** Body for PATCH /feed-posts/:id — metadata plus publish/unpublish. */
export const FeedPostUpdateSchema = z.object({
  ...feedPostMeta,
  // Only the two tailor-controllable states; 'removed' is moderation-only.
  status: z.enum(['published', 'hidden']).optional(),
});
export type FeedPostUpdateInput = z.infer<typeof FeedPostUpdateSchema>;

/**
 * Largest page any feed-shaped endpoint will serve.
 *
 * Exported because callers need to know it, not just obey it. The catalogue
 * page asks for one big page and renders it server-side, and when it guessed a
 * number above this cap the API answered 400 — which the page turned into a
 * 500, since a validation failure is a bug rather than a missing shop. Import
 * this instead of writing a literal.
 */
export const FEED_MAX_LIMIT = 48;

/**
 * Query for GET /feed. Keyset pagination, not offset: an offset feed
 * duplicates and skips posts as new work is published while you scroll.
 */
export const FeedQuerySchema = z.object({
  /** Opaque cursor from the previous page's `nextCursor`. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(FEED_MAX_LIMIT).default(24),
  garmentType: z.string().optional(),
  city: z.string().optional(),
  fabric: z.string().optional(),
  audience: WorkAudienceSchema.optional(),
  occasion: WorkOccasionSchema.optional(),
  tailorId: z.string().uuid().optional(),
  /** Free text over caption, garment type and tags. */
  q: z.string().optional(),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedPageSchema = z.object({
  items: z.array(FeedPostPublicSchema),
  /** Null when this is the last page. */
  nextCursor: z.string().nullable(),
});
export type FeedPage = z.infer<typeof FeedPageSchema>;

/** GET /feed/:id — one post plus its tailor and (later) similar work. */
export const FeedPostDetailSchema = z.object({
  post: FeedPostPublicSchema,
  /** Empty until pgvector similarity lands (roadmap 3.7 / phase C5). */
  moreLikeThis: z.array(FeedPostPublicSchema),
});
export type FeedPostDetail = z.infer<typeof FeedPostDetailSchema>;
