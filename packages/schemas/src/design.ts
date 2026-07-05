import { z } from 'zod';

// ============================================================================
// Designs — the tailor's inspiration library ("moodboard").
//
// A design is an image (uploaded now; AI-generated later) that a tailor saves
// for inspiration. It's tailor-scoped and independent of any order; a design
// can be *attached* to an order, which copies it into that order's photos.
//
// Mirrors the order-photo shape: metadata row + short-lived signed URLs added
// by API responses. Pixels live in the private `designs` Supabase Storage
// bucket under `<tailor_id>/designs/<uuid>.<ext>`.
// ============================================================================

export const DesignSourceSchema = z.enum(['uploaded', 'generated']);
export type DesignSource = z.infer<typeof DesignSourceSchema>;

export const DesignSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  source: DesignSourceSchema,
  storagePath: z.string(),
  thumbnailPath: z.string().nullable(),
  contentType: z.string().nullable(),
  caption: z.string().nullable(),
  tags: z.array(z.string()),
  /** Last accepted AI description (M3). */
  aiNotes: z.string().nullable(),
  /** Generation prompt (M4, future). */
  prompt: z.string().nullable(),
  createdAt: z.string().datetime(),
  /** Short-lived signed URL for the full image — populated by API responses. */
  signedUrl: z.string().url().optional(),
  /** Short-lived signed URL for the thumbnail (if available). */
  thumbnailUrl: z.string().url().optional(),
});
export type Design = z.infer<typeof DesignSchema>;

/** Body for POST /designs (after the mobile uploads to Storage directly). */
export const DesignCreateSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  source: DesignSourceSchema.optional(),
  prompt: z.string().nullable().optional(),
});
export type DesignCreateInput = z.infer<typeof DesignCreateSchema>;

/** Body for PATCH /designs/:id. */
export const DesignUpdateSchema = z.object({
  caption: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  aiNotes: z.string().nullable().optional(),
});
export type DesignUpdateInput = z.infer<typeof DesignUpdateSchema>;

/** Body for POST /designs/:id/attach-to-order. */
export const DesignAttachToOrderSchema = z.object({
  orderId: z.string().uuid(),
});
export type DesignAttachToOrderInput = z.infer<typeof DesignAttachToOrderSchema>;
