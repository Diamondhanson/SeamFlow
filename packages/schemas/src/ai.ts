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
