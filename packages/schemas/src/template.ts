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

/**
 * One reference image / stencil attached to a template. What the client sends
 * on create/update — `id` is a client-generated uuid so entries have a stable
 * key for edit/remove. Images are stored in the `designs` bucket under
 * `<tailorId>/templates/<id>`.
 */
export const TemplateImageInputSchema = z.object({
  id: z.string().min(1),
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
});
export type TemplateImageInput = z.infer<typeof TemplateImageInputSchema>;

/**
 * A template image as returned by the API — the stored fields plus short-lived
 * signed URLs the API resolves on read (absent when reading straight from DB).
 */
export const TemplateImageSchema = TemplateImageInputSchema.extend({
  signedUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});
export type TemplateImage = z.infer<typeof TemplateImageSchema>;

export const MeasurementTemplateSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  name: z.string().min(1),
  garmentType: z.string().nullable(),
  description: z.string().nullable(),
  fields: z.array(TemplateFieldSchema),
  images: z.array(TemplateImageSchema),
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
  images: z.array(TemplateImageInputSchema).default([]),
});
export type MeasurementTemplateCreateInput = z.infer<
  typeof MeasurementTemplateCreateSchema
>;

/** Body schema for PATCH /measurement-templates/:id. All fields optional. */
export const MeasurementTemplateUpdateSchema = MeasurementTemplateCreateSchema.partial();
export type MeasurementTemplateUpdateInput = z.infer<
  typeof MeasurementTemplateUpdateSchema
>;
