import { z } from 'zod';

export const MeasurementUnitSchema = z.enum(['cm', 'in']);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

export const MeasurementValuesSchema = z.record(z.string(), z.number().positive());
export type MeasurementValues = z.infer<typeof MeasurementValuesSchema>;

export const MeasurementSetSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  templateId: z.string().uuid().nullable(),
  label: z.string(),
  values: MeasurementValuesSchema,
  unitPreference: MeasurementUnitSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MeasurementSet = z.infer<typeof MeasurementSetSchema>;

/** Body schema for POST /clients/:clientId/measurement-sets. */
export const MeasurementSetCreateSchema = z.object({
  label: z.string().min(1).optional(),
  templateId: z.string().uuid().nullable().optional(),
  values: MeasurementValuesSchema,
  unitPreference: MeasurementUnitSchema.optional(),
});
export type MeasurementSetCreateInput = z.infer<typeof MeasurementSetCreateSchema>;

/** Body schema for PATCH /measurement-sets/:id. All fields optional. */
export const MeasurementSetUpdateSchema = MeasurementSetCreateSchema.partial();
export type MeasurementSetUpdateInput = z.infer<typeof MeasurementSetUpdateSchema>;
