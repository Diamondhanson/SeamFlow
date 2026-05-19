import { z } from 'zod';

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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Fabric = z.infer<typeof FabricSchema>;
