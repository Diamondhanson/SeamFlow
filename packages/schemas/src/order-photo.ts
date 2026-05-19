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
