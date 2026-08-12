// ============================================================================
// Offers — a tailor's answer to a client's request.
//
// The offer is deliberately thin: a message, an optional price, and optionally
// one piece of past work. That shape is a choice, not an omission.
//
// A price is OPTIONAL because forcing one turns the board into a lowest-bid
// auction, which is the fastest way to make skilled tailors leave. "Open to
// discuss" is a legitimate answer, and the client compares work and trust
// alongside money rather than sorting by cheapest.
//
// See ROADMAP appendix H (H.2.4, H.11).
// ============================================================================

import { z } from 'zod';

export const OfferStatusSchema = z.enum([
  'sent',
  /** The client flagged it as a contender without committing. */
  'shortlisted',
  'accepted',
  /** Auto-set on every other offer when one is accepted. */
  'declined',
  /** The tailor pulled it. */
  'withdrawn',
]);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

export const OfferSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  tailorId: z.string().uuid(),
  /** Firm price, or the bottom of a range. Null with priceMax null = "discuss". */
  price: z.string().nullable(),
  priceMax: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  message: z.string(),
  /** A relevant past piece from the tailor's feed, shown with the offer. */
  samplePostId: z.string().uuid().nullable(),
  status: OfferStatusSchema,
  /** Set when the client accepts — the thread the two of them continue in. */
  conversationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Offer = z.infer<typeof OfferSchema>;

/**
 * An offer as the CLIENT sees it while comparing.
 *
 * Carries the tailor alongside it, because an offer judged on price alone is
 * the failure mode this whole feature is trying to avoid — the client should
 * see who is offering, what they have made, and how reliably they reply,
 * before they see the number.
 */
export const OfferWithTailorSchema = OfferSchema.extend({
  tailor: z.object({
    id: z.string().uuid(),
    businessName: z.string(),
    city: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    isVerified: z.boolean(),
    responseTimeHours: z.number().int().nullable(),
    specialties: z.array(z.string()),
    completedOrders: z.number().int(),
  }),
  /** Signed URL for the attached sample, if one was given. */
  sampleUrl: z.string().nullable().optional(),
});
export type OfferWithTailor = z.infer<typeof OfferWithTailorSchema>;

/** An offer as the TAILOR sees it in "my offers", with what it was answering. */
export const OfferWithRequestSchema = OfferSchema.extend({
  requestTitle: z.string().nullable(),
  requestGarmentType: z.string(),
  requestStatus: z.string(),
  requestPhotoUrl: z.string().nullable().optional(),
});
export type OfferWithRequest = z.infer<typeof OfferWithRequestSchema>;

/** Body for POST /requests/:id/offers. */
export const OfferCreateSchema = z
  .object({
    /** Both omitted means "open to discuss" — a first-class answer. */
    price: z.number().nonnegative().nullable().optional(),
    priceMax: z.number().nonnegative().nullable().optional(),
    currency: z.string().length(3).nullable().optional(),
    message: z.string().min(10).max(1000),
    samplePostId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.price == null || v.priceMax == null || v.priceMax >= v.price, {
    message: 'The top of the range cannot be below the bottom',
    path: ['priceMax'],
  })
  .refine((v) => (v.priceMax != null ? v.price != null : true), {
    message: 'Give the bottom of the range too',
    path: ['price'],
  });
export type OfferCreateInput = z.infer<typeof OfferCreateSchema>;

/** Result of accepting — the client lands straight in the conversation. */
export const OfferAcceptResultSchema = z.object({
  offer: OfferSchema,
  conversationId: z.string().uuid(),
  /** How many other offers were politely declined as a result. */
  declinedCount: z.number().int(),
});
export type OfferAcceptResult = z.infer<typeof OfferAcceptResultSchema>;
