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
 * The public projection — what anyone browsing the feed receives.
 * `width`/`height` let a masonry grid reserve space before the image loads.
 */
export const FeedPostPublicSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
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
 * Query for GET /feed. Keyset pagination, not offset: an offset feed
 * duplicates and skips posts as new work is published while you scroll.
 */
export const FeedQuerySchema = z.object({
  /** Opaque cursor from the previous page's `nextCursor`. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
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
