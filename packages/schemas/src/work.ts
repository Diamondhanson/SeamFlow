import { z } from 'zod';

// ============================================================================
// "My Designs" — the tailor's portfolio of work they actually MADE.
//
// Distinct from `Design` (./design.ts), which is the Design Studio: inspiration
// collected from elsewhere. A Work is the tailor's own finished piece, and it
// is the only thing that can be published to the public discovery feed.
//
// Attributes are enums rather than free text on purpose. Filters are the whole
// point of this screen, and they stop working the moment two tailors spell
// "womens" three different ways.
// ============================================================================

export const WorkAudienceSchema = z.enum(['women', 'men', 'unisex', 'children']);
export type WorkAudience = z.infer<typeof WorkAudienceSchema>;

export const WorkOccasionSchema = z.enum([
  'wedding',
  'traditional',
  'corporate',
  'casual',
  'party',
]);
export type WorkOccasion = z.infer<typeof WorkOccasionSchema>;

export const WorkSourceSchema = z.enum(['upload', 'order_photo']);
export type WorkSource = z.infer<typeof WorkSourceSchema>;

/** Attributes the tailor sets. All optional — describe now or describe later. */
const workMeta = {
  title: z.string().max(120).nullable().optional(),
  garmentType: z.string().max(60).nullable().optional(),
  audience: WorkAudienceSchema.nullable().optional(),
  fabric: z.string().max(80).nullable().optional(),
  occasion: WorkOccasionSchema.nullable().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
};

export const WorkSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  source: WorkSourceSchema,
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  orderPhotoId: z.string().uuid().nullable(),
  orderId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  garmentType: z.string().nullable(),
  audience: WorkAudienceSchema.nullable(),
  fabric: z.string().nullable(),
  occasion: WorkOccasionSchema.nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  /** Short-lived signed URLs — the source image is private. */
  signedUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),

  /** Set while this work is live in the public feed. */
  feedPostId: z.string().uuid().nullable(),
  isPublished: z.boolean(),
});
export type Work = z.infer<typeof WorkSchema>;

/** Body for POST /works, after the app uploads into the private `works` bucket. */
export const WorkCreateSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  ...workMeta,
});
export type WorkCreateInput = z.infer<typeof WorkCreateSchema>;

/** Body for POST /order-photos/:id/adopt — pull a finished order photo in. */
export const WorkAdoptSchema = z.object(workMeta);
export type WorkAdoptInput = z.infer<typeof WorkAdoptSchema>;

export const WorkUpdateSchema = z.object(workMeta);
export type WorkUpdateInput = z.infer<typeof WorkUpdateSchema>;

/** Query for GET /works — the My Designs filter bar. */
export const WorkQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(30),
  garmentType: z.string().optional(),
  audience: WorkAudienceSchema.optional(),
  fabric: z.string().optional(),
  occasion: WorkOccasionSchema.optional(),
  /** 'published' | 'unpublished' — filter by whether it's live in the feed. */
  published: z.enum(['published', 'unpublished']).optional(),
  q: z.string().optional(),
});
export type WorkQuery = z.infer<typeof WorkQuerySchema>;

export const WorkPageSchema = z.object({
  items: z.array(WorkSchema),
  nextCursor: z.string().nullable(),
});
export type WorkPage = z.infer<typeof WorkPageSchema>;

/**
 * Distinct attribute values actually present in this tailor's portfolio, so
 * the filter bar only offers chips that will return something. Offering a
 * filter that yields an empty grid is worse than not offering it.
 */
export const WorkFacetsSchema = z.object({
  garmentTypes: z.array(z.string()),
  fabrics: z.array(z.string()),
  audiences: z.array(WorkAudienceSchema),
  occasions: z.array(WorkOccasionSchema),
  total: z.number().int(),
  publishedCount: z.number().int(),
});
export type WorkFacets = z.infer<typeof WorkFacetsSchema>;

/** Body for POST /works/:id/publish — the public listing's own fields. */
export const WorkPublishSchema = z.object({
  caption: z.string().max(280).nullable().optional(),
  startingPrice: z.string().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
});
export type WorkPublishInput = z.infer<typeof WorkPublishSchema>;
