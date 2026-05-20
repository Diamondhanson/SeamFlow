import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string(),
  /** Single free-form address. Captured at create time; nullable for legacy. */
  address: z.string().nullable(),
  email: z.string().email().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Client = z.infer<typeof ClientSchema>;

/**
 * Body schema for POST /clients. tailorId resolves from auth.
 *
 * Mobile new-client form only collects name, phone, address — these three
 * are required. email + notes still accepted (back-compat / edit screen).
 */
export const ClientCreateSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;

/** Body schema for PATCH /clients/:id. All fields optional. */
export const ClientUpdateSchema = ClientCreateSchema.partial();
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
