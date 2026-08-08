import { z } from 'zod';

export const TailorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessName: z.string().min(1),
  photoUrl: z.string().url().nullable(),
  location: z.string().nullable(),
  countryCode: z.string().length(2),
  currency: z.string().length(3),

  // ── Public storefront + trust (ROADMAP D.1.2) ─────────────────────────────
  // Present on the tailor's own /me response so the app can edit them. The
  // PUBLIC projection is TailorPublicProfile in ./tailor-profile — use that
  // anywhere an anonymous viewer is served, since this shape is owner-only.
  bio: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  specialties: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  avatarPath: z.string().nullable().default(null),
  /** Admin-granted. Not settable through TailorProfileUpdate. */
  isVerified: z.boolean().default(false),
  acceptsRemote: z.boolean().default(false),
  followerCount: z.number().int().default(0),
  /** Computed nightly from real reply latency. Not self-settable. */
  responseTimeHours: z.number().int().nullable().default(null),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Tailor = z.infer<typeof TailorSchema>;

/** Body schema for POST /me/tailor (upsert). userId resolves from auth. */
export const TailorUpsertSchema = z.object({
  businessName: z.string().min(1),
  photoUrl: z.string().url().nullable().optional(),
  location: z.string().nullable().optional(),
  countryCode: z.string().length(2),
  currency: z.string().length(3),
});
export type TailorUpsertInput = z.infer<typeof TailorUpsertSchema>;
