import { z } from 'zod';

// ============================================================================
// Tailor public storefront + trust signals (ROADMAP D.1.2 / D.2.2).
//
// Two shapes, and the split is the whole point:
//
//   TailorPublicProfile — what an anonymous browser may see. Deliberately has
//                         NO account phone, NO email, NO user id. Anything
//                         added here becomes world-readable, so add with care.
//
//                         `whatsapp` is the one contact detail present, and it
//                         is not an exception to that rule: it is a SEPARATE,
//                         opt-in column (tailors.public_whatsapp), null by
//                         default, typed in by a tailor who knows it goes on a
//                         public page. users.phone is a sign-in credential and
//                         is still never projected here.
//
//   TailorProfileUpdate — what the owning tailor may change about themselves.
//                         Notably excludes `isVerified` and `responseTimeHours`:
//                         a trust signal you can set yourself isn't a trust
//                         signal. Verification is admin-granted; response time
//                         is computed nightly from real reply latency.
// ============================================================================

/**
 * A tailor's public catalogue address — the `<slug>` in /t/<slug>.
 *
 * The regex is duplicated in two other places on purpose: `isValidSlugShape`
 * in @seamflow/utils (which generates candidates) and the `tailors_slug_format`
 * check constraint in the database (which is the last line of defence for a
 * value that ends up inside a URL). Change one, change all three.
 */
export const TailorSlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');
export type TailorSlug = z.infer<typeof TailorSlugSchema>;

/**
 * An opt-in, world-readable WhatsApp number in E.164.
 *
 * Strict `+<digits>` only — no local formats. The tailor app normalises what
 * was typed before it gets here, so anything non-canonical arriving at the API
 * means the client skipped that step, and quietly accepting it would put a
 * number on a public page that `wa.me` cannot dial.
 */
export const PublicWhatsappSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Enter a full international number, e.g. +237670151973');

/** Trust badges shown next to a tailor on a design or storefront. */
export const TailorTrustSchema = z.object({
  isVerified: z.boolean(),
  acceptsRemote: z.boolean(),
  /** Median reply latency in hours; null until they've replied enough to judge. */
  responseTimeHours: z.number().int().nullable(),
  followerCount: z.number().int(),
});
export type TailorTrust = z.infer<typeof TailorTrustSchema>;

/**
 * The compact tailor card attached to every feed post — enough to decide
 * whether to tap, without a second request.
 */
export const TailorMiniProfileSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string(),
  /**
   * Public catalogue address, or null if they have never shared one. Present
   * on the mini profile so any feed item can build a link to its maker without
   * a second request.
   */
  slug: TailorSlugSchema.nullable(),
  city: z.string().nullable(),
  /** Stable public URL (avatars bucket is public) or null. */
  avatarUrl: z.string().url().nullable(),
  isVerified: z.boolean(),
  acceptsRemote: z.boolean(),
  responseTimeHours: z.number().int().nullable(),
});
export type TailorMiniProfile = z.infer<typeof TailorMiniProfileSchema>;

/**
 * Full public storefront header — also the payload behind the shared catalogue
 * page, which is why it carries the opt-in `whatsapp` and the mini profile
 * does not: a feed thumbnail is not a place to put someone's phone number.
 */
export const TailorPublicProfileSchema = TailorMiniProfileSchema.extend({
  bio: z.string().nullable(),
  /**
   * Opt-in public WhatsApp, E.164, or null. Null is the default and the common
   * case — render no contact button rather than an empty one.
   */
  whatsapp: PublicWhatsappSchema.nullable(),
  specialties: z.array(z.string()),
  languages: z.array(z.string()),
  followerCount: z.number().int(),
  currency: z.string().length(3),
  memberSince: z.string().datetime(),
});
export type TailorPublicProfile = z.infer<typeof TailorPublicProfileSchema>;

/** Body for PATCH /me/tailor-profile. Every field optional — partial update. */
export const TailorProfileUpdateSchema = z.object({
  bio: z.string().max(600).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  specialties: z.array(z.string().min(1).max(40)).max(12).optional(),
  languages: z.array(z.string().min(1).max(40)).max(12).optional(),
  avatarPath: z.string().nullable().optional(),
  acceptsRemote: z.boolean().optional(),
  /**
   * Change the catalogue address. Rejected if taken or reserved — the API
   * answers 409 rather than silently picking a variant, because a tailor
   * editing this has a specific address in mind and a near-miss substitute
   * would be worse than an error.
   */
  slug: TailorSlugSchema.optional(),
  /** Null clears it, which removes the contact button from the public page. */
  publicWhatsapp: PublicWhatsappSchema.nullable().optional(),
});
export type TailorProfileUpdateInput = z.infer<typeof TailorProfileUpdateSchema>;

/**
 * Response of POST /me/catalogue-link.
 *
 * Minting is lazy: the slug is created on the first call and reused forever
 * after, so this is safe to call every time the tailor taps Share. Unlike an
 * order share link there is no token and no expiry — a catalogue is public by
 * definition, so the URL is permanent and can go on a printed sign.
 */
export const CatalogueLinkSchema = z.object({
  url: z.string().url(),
  slug: TailorSlugSchema,
  /** Published works behind the link. Zero means the page would look empty. */
  publishedCount: z.number().int().nonnegative(),
});
export type CatalogueLink = z.infer<typeof CatalogueLinkSchema>;
