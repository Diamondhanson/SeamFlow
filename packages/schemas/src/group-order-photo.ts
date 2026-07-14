import { z } from 'zod';
import { OrderPhotoRoleSchema } from './order-photo';

// A shared reference/inspiration image attached to a whole group order (the
// "one pattern, many measurements" case). Mirrors OrderPhoto but keyed to a
// group order instead of a single order.

export const GroupOrderPhotoSchema = z.object({
  id: z.string().uuid(),
  groupOrderId: z.string().uuid(),
  storagePath: z.string(),
  thumbnailPath: z.string().nullable(),
  contentType: z.string().nullable(),
  role: OrderPhotoRoleSchema,
  caption: z.string().nullable(),
  uploadedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  /** Short-lived signed URL for the full image — populated by API responses. */
  signedUrl: z.string().url().optional(),
  /** Short-lived signed URL for the thumbnail (if available). */
  thumbnailUrl: z.string().url().optional(),
});
export type GroupOrderPhoto = z.infer<typeof GroupOrderPhotoSchema>;

/** Body for POST /group-orders/:id/photos (after the mobile uploads to Storage). */
export const GroupOrderPhotoCreateSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  role: OrderPhotoRoleSchema.optional(),
  caption: z.string().nullable().optional(),
});
export type GroupOrderPhotoCreateInput = z.infer<typeof GroupOrderPhotoCreateSchema>;

export const GroupOrderPhotoUpdateSchema = z.object({
  role: OrderPhotoRoleSchema.optional(),
  caption: z.string().nullable().optional(),
});
export type GroupOrderPhotoUpdateInput = z.infer<typeof GroupOrderPhotoUpdateSchema>;
