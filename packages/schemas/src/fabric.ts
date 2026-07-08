import { z } from 'zod';

/**
 * A fabric in the tailor's library. `yardageMeters` / `costPerMeter` are
 * numeric-as-string (consistent with the DB numeric columns) so precision is
 * never lost in transit. The swatch photo is stored as two WebP variants —
 * `photoKey` (full) + `photoThumbKey` (thumb) — in the private `designs`
 * bucket; the API resolves short-lived signed URLs for both on read.
 */
export const FabricSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  name: z.string().min(1),
  supplier: z.string().nullable(),
  color: z.string().nullable(),
  composition: z.string().nullable(),
  yardageMeters: z.string().nullable(),
  costPerMeter: z.string().nullable(),
  photoKey: z.string().nullable(),
  photoThumbKey: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Fabric = z.infer<typeof FabricSchema>;

/** A fabric row as returned by the API, with resolved signed photo URLs. */
export const FabricResponseSchema = FabricSchema.extend({
  photoUrl: z.string().url().nullable(),
  photoThumbUrl: z.string().url().nullable(),
});
export type FabricResponse = z.infer<typeof FabricResponseSchema>;

/** Body for POST /fabrics — only `name` is required. */
export const FabricCreateSchema = z.object({
  name: z.string().min(1),
  supplier: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  composition: z.string().nullable().optional(),
  yardageMeters: z.string().nullable().optional(),
  costPerMeter: z.string().nullable().optional(),
  photoKey: z.string().nullable().optional(),
  photoThumbKey: z.string().nullable().optional(),
});
export type FabricCreateInput = z.infer<typeof FabricCreateSchema>;

/** Body for PATCH /fabrics/:id — every field optional. */
export const FabricUpdateSchema = FabricCreateSchema.partial();
export type FabricUpdateInput = z.infer<typeof FabricUpdateSchema>;

/**
 * Compact fabric shape shown on the client-facing shared order page and used
 * when attaching a fabric to an order elsewhere.
 */
export const OrderFabricSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  photoUrl: z.string().url().nullable(),
});
export type OrderFabric = z.infer<typeof OrderFabricSchema>;
