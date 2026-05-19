import { z } from 'zod';

export const TailorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessName: z.string().min(1),
  photoUrl: z.string().url().nullable(),
  location: z.string().nullable(),
  countryCode: z.string().length(2),
  currency: z.string().length(3),
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
