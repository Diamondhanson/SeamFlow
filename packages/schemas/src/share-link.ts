import { z } from 'zod';
import { OrderSchema, OrderItemSchema } from './order';
import { OrderPhotoSchema } from './order-photo';
import { OrderFabricSchema } from './fabric';

/** Response from POST /orders/:id/share-link. */
export const ShareLinkResponseSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
});
export type ShareLinkResponse = z.infer<typeof ShareLinkResponseSchema>;

/** Tailor brand info embedded in the public payload. Lean by design — only
 *  the fields the client-facing view needs. */
export const PublicTailorSchema = z.object({
  businessName: z.string(),
  location: z.string().nullable(),
});
export type PublicTailor = z.infer<typeof PublicTailorSchema>;

/**
 * Response from GET /public/orders/:token.
 *
 * `effectiveExpiresAt` is whichever expiry kicks in first (token-exp or
 * delivery+2d); the client uses it to render "expires in N hours" hints.
 */
export const PublicOrderResponseSchema = z.object({
  order: OrderSchema,
  items: z.array(OrderItemSchema),
  photos: z.array(OrderPhotoSchema),
  /** The fabric for this order (its own, or its group's shared fabric). */
  fabric: OrderFabricSchema.nullable(),
  tailor: PublicTailorSchema,
  effectiveExpiresAt: z.string().datetime(),
});
export type PublicOrderResponse = z.infer<typeof PublicOrderResponseSchema>;
