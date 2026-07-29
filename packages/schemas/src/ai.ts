import { z } from 'zod';

// ============================================================================
// AI image→text (Claude vision) — "auto-describe".
//
// Shared request/response contract so the mobile app, api-client, and the
// future NestJS `ai` module all agree on shape. The backend endpoint is NOT
// wired up yet (M3); the mobile UI currently uses a local stub that returns
// canned text so the flow can be reviewed before we connect Claude.
//
//   mode:
//     'spec'   → a garment description paragraph (for order notes)
//     'fabric' → color / pattern / likely material / suggested garments
//     'tags'   → a short list of searchable tags
// ============================================================================

export const AiDescribeModeSchema = z.enum(['spec', 'fabric', 'tags']);
export type AiDescribeMode = z.infer<typeof AiDescribeModeSchema>;

/** Body for POST /ai/describe-image. `storagePath` points at an object the
 *  caller's tailor owns (a design or an order photo). */
export const AiDescribeImageRequestSchema = z.object({
  storagePath: z.string().min(1),
  mode: AiDescribeModeSchema,
});
export type AiDescribeImageRequest = z.infer<typeof AiDescribeImageRequestSchema>;

export const AiDescribeImageResponseSchema = z.object({
  mode: AiDescribeModeSchema,
  text: z.string(),
  tags: z.array(z.string()).optional(),
});
export type AiDescribeImageResponse = z.infer<typeof AiDescribeImageResponseSchema>;

// ============================================================================
// AI text→text — "tidy up" a tailor's rough order notes into a clean summary.
// Same server plumbing as describe-image (Claude, 503 when ANTHROPIC_API_KEY is
// unset). Text-only, so no image / storagePath.
// ============================================================================

/** Body for POST /ai/summarize-notes. */
export const AiSummarizeNotesRequestSchema = z.object({
  notes: z.string().min(1).max(4000),
});
export type AiSummarizeNotesRequest = z.infer<typeof AiSummarizeNotesRequestSchema>;

export const AiSummarizeNotesResponseSchema = z.object({
  text: z.string(),
});
export type AiSummarizeNotesResponse = z.infer<typeof AiSummarizeNotesResponseSchema>;

// ============================================================================
// AI photo→measurements — "scan to measurement".
//
// One extraction, two uses (see docs/measurement-scan-plan.md):
//   mode 'template'     → read measurement NAMES off a blank booklet page
//                         (every item's `value` is null) → pre-fill a template.
//   mode 'measurements' → read name + handwritten NUMBER pairs off a client's
//                         filled sheet → pre-fill a measurement set.
//
// The endpoint never saves anything — the app always lands the result on an
// editable form for review. Labels are returned exactly as read; locale
// normalization happens client-side (the app owns the i18n dictionary).
// ============================================================================

export const AiExtractModeSchema = z.enum(['template', 'measurements']);
export type AiExtractMode = z.infer<typeof AiExtractModeSchema>;

/** Body for POST /ai/extract-measurements. `storagePath` points at an image
 *  the caller's tailor owns (same ownership rule as describe-image). */
export const AiExtractMeasurementsRequestSchema = z.object({
  storagePath: z.string().min(1),
  mode: AiExtractModeSchema,
});
export type AiExtractMeasurementsRequest = z.infer<
  typeof AiExtractMeasurementsRequestSchema
>;

/** One measurement line as read off the page. `value` is null in template
 *  mode and for blank cells; `confidence: 'low'` flags rows the UI should
 *  highlight for review. */
export const ExtractedMeasurementItemSchema = z.object({
  label: z.string().min(1),
  unit: z.enum(['cm', 'in']).nullable(),
  value: z.number().positive().nullable(),
  confidence: z.enum(['high', 'low']).optional(),
});
export type ExtractedMeasurementItem = z.infer<typeof ExtractedMeasurementItemSchema>;

export const AiExtractMeasurementsResponseSchema = z.object({
  mode: AiExtractModeSchema,
  /** Page-level unit hint when the sheet states one (e.g. "all in cm"). */
  detectedUnit: z.enum(['cm', 'in']).nullable(),
  items: z.array(ExtractedMeasurementItemSchema),
});
export type AiExtractMeasurementsResponse = z.infer<
  typeof AiExtractMeasurementsResponseSchema
>;
