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

/**
 * A price a tailor is willing to be quoted on.
 *
 * A STRING, and in MAJOR units — "25000.00" is twenty-five thousand francs.
 * It stays a string end to end because it is a numeric(12,2) in Postgres, and
 * routing money through a JS float is how you get 24999.999999999996 on a bill.
 *
 * Presented as "From 25,000 FCFA" everywhere it is shown. That framing is not
 * decoration: this is made-to-measure work where fabric and finishing move the
 * final figure, and a flat number invites an argument after measuring.
 */
export const StartingPriceSchema = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount like 25000 or 25000.50');

/** Attributes the tailor sets. All optional — describe now or describe later. */
const workMeta = {
  title: z.string().max(120).nullable().optional(),
  /** Longer note shown under the design on the public catalogue. */
  description: z.string().max(600).nullable().optional(),
  garmentType: z.string().max(60).nullable().optional(),
  audience: WorkAudienceSchema.nullable().optional(),
  fabric: z.string().max(80).nullable().optional(),
  occasion: WorkOccasionSchema.nullable().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  startingPrice: StartingPriceSchema.nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
};

/**
 * How many photos one design may carry.
 *
 * A carousel is front / back / side / detail — a handful of angles on one
 * garment. Past that it stops being a design and becomes an album nobody
 * swipes to the end of, and every extra photo is another copy into the public
 * bucket at publish time.
 */
export const MAX_WORK_IMAGES = 8;

/** One photo of a design, private, addressed by short-lived signed URL. */
export const WorkImageSchema = z.object({
  id: z.string().uuid(),
  /** 0 is the cover — what the grid and the feed thumbnail show. */
  position: z.number().int().nonnegative(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  signedUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});
export type WorkImage = z.infer<typeof WorkImageSchema>;

/** One uploaded photo, as the app reports it after putting it in the bucket. */
export const WorkImageCreateSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});
export type WorkImageCreateInput = z.infer<typeof WorkImageCreateSchema>;

export const WorkSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  source: WorkSourceSchema,
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  orderPhotoId: z.string().uuid().nullable(),
  orderId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  garmentType: z.string().nullable(),
  audience: WorkAudienceSchema.nullable(),
  fabric: z.string().nullable(),
  occasion: WorkOccasionSchema.nullable(),
  tags: z.array(z.string()),
  startingPrice: z.string().nullable(),
  currency: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  /**
   * Every photo of this design, cover first. Always at least one.
   */
  images: z.array(WorkImageSchema),

  /**
   * Cover image URLs, duplicating `images[0]`.
   *
   * Kept because most callers want one representative picture and should not
   * have to reach into an array for it — and because every screen that existed
   * before designs had carousels still reads these.
   */
  signedUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),

  /** Set while this work is live in the public feed. */
  feedPostId: z.string().uuid().nullable(),
  isPublished: z.boolean(),
});
export type Work = z.infer<typeof WorkSchema>;

/**
 * Body for POST /works, after the app uploads into the private `works` bucket.
 *
 * `images` is ordered and the first entry becomes the cover. One image is the
 * common case and still valid — a carousel is just a longer list, not a
 * different kind of thing.
 */
export const WorkCreateSchema = z.object({
  images: z.array(WorkImageCreateSchema).min(1).max(MAX_WORK_IMAGES),
  orderId: z.string().uuid().nullable().optional(),
  ...workMeta,
});
export type WorkCreateInput = z.infer<typeof WorkCreateSchema>;

/** Body for POST /works/:id/images — add more angles to an existing design. */
export const WorkImagesAddSchema = z.object({
  images: z.array(WorkImageCreateSchema).min(1).max(MAX_WORK_IMAGES),
});
export type WorkImagesAddInput = z.infer<typeof WorkImagesAddSchema>;

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

/**
 * Body for POST /works/:id/publish — overrides for the public listing.
 *
 * Every field is optional and falls back to the design's own. Since price and
 * description moved onto the work, publishing normally sends nothing at all;
 * these remain so a tailor can publish with a different public caption than
 * their private notes.
 */
export const WorkPublishSchema = z.object({
  caption: z.string().max(280).nullable().optional(),
  startingPrice: StartingPriceSchema.nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
});
export type WorkPublishInput = z.infer<typeof WorkPublishSchema>;
