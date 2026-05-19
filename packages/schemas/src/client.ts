import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string(),
  email: z.string().email().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Client = z.infer<typeof ClientSchema>;

/** Body schema for POST /clients. tailorId resolves from auth. */
export const ClientCreateSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;

/** Body schema for PATCH /clients/:id. All fields optional. */
export const ClientUpdateSchema = ClientCreateSchema.partial();
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
