// ============================================================================
// Requests — "Can you make this?"
//
// The mirror of the discovery feed. The feed is "tailors post work, clients
// come to them"; this is the reverse: a client posts a photo of the garment
// they want, tailors answer with offers, the client picks one. Together they
// cover both directions a commission can start from.
//
// Why this direction matters more right now: the feed needs tailors to build a
// portfolio before anything happens, and after months nothing has been
// published. A request needs one photo from one client and any tailor can
// answer it — which also means a new tailor with no portfolio can still win
// work. See ROADMAP appendix H.
// ============================================================================

import { z } from 'zod';
import { GarmentKeySchema } from './garment';

/** Who can see and answer a request. */
export const RequestVisibilitySchema = z.enum([
  /** Only the tailors the client named. */
  'selected',
  /** Any eligible tailor within the chosen area. */
  'location',
]);
export type RequestVisibility = z.infer<typeof RequestVisibilitySchema>;

export const RequestLocationScopeSchema = z.enum(['town', 'region', 'country']);
export type RequestLocationScope = z.infer<typeof RequestLocationScopeSchema>;

export const RequestStatusSchema = z.enum([
  'open',
  /** The client closed it themselves. */
  'closed',
  /** An offer was accepted. */
  'fulfilled',
  /** Passed its expiry without being answered or closed. */
  'expired',
  /** Taken down by moderation. */
  'removed',
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

/** A photo on a request. Copied into the public bucket on post, same as the
 *  feed — the client's private upload never becomes publicly addressable. */
export const RequestPhotoSchema = z.object({
  path: z.string(),
  thumbPath: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});
export type RequestPhoto = z.infer<typeof RequestPhotoSchema>;

export const RequestSchema = z.object({
  id: z.string().uuid(),
  clientUserId: z.string().uuid(),
  title: z.string().nullable(),
  description: z.string(),
  garmentType: GarmentKeySchema,
  styleTags: z.array(z.string()),
  photos: z.array(RequestPhotoSchema),
  budgetMin: z.string().nullable(),
  budgetMax: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  deadline: z.string().nullable(),
  visibility: RequestVisibilitySchema,
  locationScope: RequestLocationScopeSchema.nullable(),
  locationValue: z.string().nullable(),
  status: RequestStatusSchema,
  /** Flips false at the offer cap so tailors stop spending time on it. */
  acceptingOffers: z.boolean(),
  offersCount: z.number().int(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Signed URLs, populated by API responses. */
  photoUrls: z.array(z.string()).optional(),
});
export type Request = z.infer<typeof RequestSchema>;

/**
 * What a tailor sees when browsing. Deliberately NOT the full row: the client's
 * user id never leaves the server on this path, because a tailor browsing an
 * open board has no business identifying the poster before an offer is accepted.
 */
export const RequestSummarySchema = RequestSchema.omit({ clientUserId: true }).extend({
  /** Has this tailor already answered? Drives "one offer per request". */
  hasMyOffer: z.boolean().optional(),
  /** Why it surfaced — matched speciality, location, or an explicit invite. */
  matchReason: z.enum(['invited', 'speciality', 'location']).optional(),
});
export type RequestSummary = z.infer<typeof RequestSummarySchema>;

/**
 * Body for POST /requests.
 *
 * A photo, a description and a garment type are all required. A request
 * missing any of them cannot be matched or answered sensibly, and letting one
 * through just produces a board of "hi, can you sew?" posts.
 */
export const RequestCreateSchema = z
  .object({
    title: z.string().max(120).nullable().optional(),
    description: z.string().min(10).max(2000),
    garmentType: GarmentKeySchema,
    styleTags: z.array(z.string().max(40)).max(8).default([]),
    photos: z.array(RequestPhotoSchema).min(1).max(6),
    budgetMin: z.number().nonnegative().nullable().optional(),
    budgetMax: z.number().nonnegative().nullable().optional(),
    currency: z.string().length(3).nullable().optional(),
    deadline: z.string().nullable().optional(),
    visibility: RequestVisibilitySchema,
    /** Required when visibility is `selected`. */
    tailorIds: z.array(z.string().uuid()).max(20).default([]),
    /** Required when visibility is `location`. */
    locationScope: RequestLocationScopeSchema.nullable().optional(),
    locationValue: z.string().max(120).nullable().optional(),
  })
  .refine((v) => (v.visibility === 'selected' ? v.tailorIds.length > 0 : true), {
    message: 'Pick at least one tailor',
    path: ['tailorIds'],
  })
  .refine(
    (v) => (v.visibility === 'location' ? !!v.locationScope && !!v.locationValue : true),
    { message: 'Choose where to send this request', path: ['locationValue'] },
  )
  .refine(
    (v) => v.budgetMin == null || v.budgetMax == null || v.budgetMax >= v.budgetMin,
    { message: 'The top of the budget cannot be below the bottom', path: ['budgetMax'] },
  );
export type RequestCreateInput = z.infer<typeof RequestCreateSchema>;

export const RequestUpdateSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  description: z.string().min(10).max(2000).optional(),
  budgetMin: z.number().nonnegative().nullable().optional(),
  budgetMax: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  deadline: z.string().nullable().optional(),
});
export type RequestUpdateInput = z.infer<typeof RequestUpdateSchema>;

/** Filters for the tailor's Requests feed. */
export const RequestQuerySchema = z.object({
  garmentType: GarmentKeySchema.optional(),
  /** Only requests whose budget could reach this. */
  minBudget: z.number().nonnegative().optional(),
  /** Only requests due on or after today + n days. */
  minDaysToDeadline: z.number().int().nonnegative().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type RequestQuery = z.infer<typeof RequestQuerySchema>;
