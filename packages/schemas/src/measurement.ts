import { z } from 'zod';

export const MeasurementUnitSchema = z.enum(['cm', 'in']);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

/**
 * Some measurements are genuinely several figures, not one — a tailor writes
 * "32-42-12" for an attribute that has three parts, and separates them with a
 * hyphen, a slash or a space depending on habit. Forcing a single number lost
 * that, so a value may also be a short compound of numbers.
 *
 * Deliberately NOT free text: only digits, an optional decimal (dot or comma,
 * because a French keyboard types a comma), joined by `-`, `/` or a space.
 * That keeps the field numeric in nature, so it can still be read back,
 * scanned, and shown on an order without ever holding prose.
 */
export const COMPOUND_MEASUREMENT_RE =
  /^\d+(?:[.,]\d+)?(?:\s*[-/ ]\s*\d+(?:[.,]\d+)?)*$/;

/**
 * A single number (the common case, and what every existing row holds) or a
 * compound string. The union is what makes this backwards compatible: stored
 * numbers keep validating, so no migration and no data rewrite.
 */
export const MeasurementValueSchema = z.union([
  z.number().positive(),
  z.string().trim().min(1).max(40).regex(COMPOUND_MEASUREMENT_RE),
]);
export type MeasurementValue = z.infer<typeof MeasurementValueSchema>;

export const MeasurementValuesSchema = z.record(z.string(), MeasurementValueSchema);
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
