import { z } from 'zod';

export const OrderPhotoRoleSchema = z.enum([
  'reference',
  'fabric',
  'work_in_progress',
  'final',
]);
export type OrderPhotoRole = z.infer<typeof OrderPhotoRoleSchema>;

export const OrderPhotoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  storagePath: z.string(),
  thumbnailPath: z.string().nullable(),
  contentType: z.string().nullable(),
  role: OrderPhotoRoleSchema,
  caption: z.string().nullable(),
  uploadedByUserId: z.string().uuid().nullable(),
  /** Set when the photo was attached from Design Studio. Provenance only —
   *  the photo owns its own file and survives the design being deleted. */
  sourceDesignId: z.string().uuid().nullable().optional(),
  /** Set when the photo was attached from My Designs. Provenance only. */
  sourceWorkId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  /** Short-lived signed URL for the full image — populated by API responses. */
  signedUrl: z.string().url().optional(),
  /** Short-lived signed URL for the thumbnail (if available). */
  thumbnailUrl: z.string().url().optional(),
});
export type OrderPhoto = z.infer<typeof OrderPhotoSchema>;

/** Body for POST /orders/:id/photos (after the mobile uploads to Storage directly). */
export const OrderPhotoCreateSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  role: OrderPhotoRoleSchema.optional(),
  caption: z.string().nullable().optional(),
});
export type OrderPhotoCreateInput = z.infer<typeof OrderPhotoCreateSchema>;

export const OrderPhotoUpdateSchema = z.object({
  role: OrderPhotoRoleSchema.optional(),
  caption: z.string().nullable().optional(),
});
export type OrderPhotoUpdateInput = z.infer<typeof OrderPhotoUpdateSchema>;

// ============================================================================
// Attaching photos an order already has access to.
//
// Before this, an order photo could only come from the camera or the phone's
// gallery — so a tailor who had saved an inspiration photo into Design Studio
// had to save it to their gallery as well and re-pick it from there. The app
// held the image and made you fetch it from outside.
//
// The file is COPIED, not referenced. An order is a record of a job that has
// to stay true months later; tidying the design studio must not punch a hole
// in an old order. The copy happens server-side inside Storage, so the phone
// never re-downloads or re-uploads an image the platform already has — which
// matters most in the exact moment this gets used, standing with a client on
// a bad connection.
// ============================================================================

export const AttachLibraryPhotosSchema = z
  .object({
    /** Designs (Design Studio) to copy onto the order. */
    designIds: z.array(z.string().uuid()).default([]),
    /** Portfolio works (My Designs) to copy onto the order. */
    workIds: z.array(z.string().uuid()).default([]),
    /** Defaults to `reference` — what a client wants it to look like. */
    role: OrderPhotoRoleSchema.optional(),
  })
  .refine((v) => v.designIds.length + v.workIds.length > 0, {
    message: 'Pick at least one design or work to attach',
  });
export type AttachLibraryPhotosInput = z.infer<typeof AttachLibraryPhotosSchema>;
