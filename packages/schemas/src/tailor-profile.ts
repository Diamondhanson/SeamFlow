import { z } from 'zod';

// ============================================================================
// Tailor public storefront + trust signals (ROADMAP D.1.2 / D.2.2).
//
// Two shapes, and the split is the whole point:
//
//   TailorPublicProfile — what an anonymous browser may see. Deliberately has
//                         NO phone, NO email, NO user id. Anything added here
//                         becomes world-readable, so add with care.
//   TailorProfileUpdate — what the owning tailor may change about themselves.
//                         Notably excludes `isVerified` and `responseTimeHours`:
//                         a trust signal you can set yourself isn't a trust
//                         signal. Verification is admin-granted; response time
//                         is computed nightly from real reply latency.
// ============================================================================

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
  city: z.string().nullable(),
  /** Stable public URL (avatars bucket is public) or null. */
  avatarUrl: z.string().url().nullable(),
  isVerified: z.boolean(),
  acceptsRemote: z.boolean(),
  responseTimeHours: z.number().int().nullable(),
});
export type TailorMiniProfile = z.infer<typeof TailorMiniProfileSchema>;

/** Full public storefront header. Still no contact details — inquiry is the path. */
export const TailorPublicProfileSchema = TailorMiniProfileSchema.extend({
  bio: z.string().nullable(),
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
});
export type TailorProfileUpdateInput = z.infer<typeof TailorProfileUpdateSchema>;
