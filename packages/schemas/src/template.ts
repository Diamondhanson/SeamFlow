import { z } from 'zod';

/**
 * A single field in a measurement template — describes a measurement the
 * tailor wants to collect, plus optional label/unit metadata for the form.
 */
export const TemplateFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  unit: z.enum(['cm', 'in']).optional(),
});
export type TemplateField = z.infer<typeof TemplateFieldSchema>;

export const MeasurementTemplateSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  name: z.string().min(1),
  garmentType: z.string().nullable(),
  description: z.string().nullable(),
  fields: z.array(TemplateFieldSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MeasurementTemplate = z.infer<typeof MeasurementTemplateSchema>;

/** Body schema for POST /measurement-templates. tailorId resolves from auth. */
export const MeasurementTemplateCreateSchema = z.object({
  name: z.string().min(1),
  garmentType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  fields: z.array(TemplateFieldSchema).default([]),
});
export type MeasurementTemplateCreateInput = z.infer<
  typeof MeasurementTemplateCreateSchema
>;

/** Body schema for PATCH /measurement-templates/:id. All fields optional. */
export const MeasurementTemplateUpdateSchema = MeasurementTemplateCreateSchema.partial();
export type MeasurementTemplateUpdateInput = z.infer<
  typeof MeasurementTemplateUpdateSchema
>;
