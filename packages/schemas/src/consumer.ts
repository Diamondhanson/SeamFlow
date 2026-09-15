import { z } from 'zod';
import {
  OrderSchema,
  OrderItemSchema,
  OrderEventSchema,
  OrderStatusSchema,
} from './order';
import { OrderPhotoSchema } from './order-photo';
import { MeasurementValuesSchema, MeasurementUnitSchema } from './measurement';

// ============================================================================
// Consumer (seamflow-client) API contracts.
//
// A signed-in end-customer claims orders via their share-link token, then sees
// a cross-tailor inbox + a measurement locker. All endpoints are scoped to the
// current auth user (never to a tailor).
// ============================================================================

/** Body for POST /consumer/claims — claim an order from its share-link token. */
export const ConsumerClaimRequestSchema = z.object({
  token: z.string().min(1),
});
export type ConsumerClaimRequest = z.infer<typeof ConsumerClaimRequestSchema>;

/** One row in the consumer's unified orders inbox (GET /consumer/orders). */
export const ConsumerOrderSummarySchema = z.object({
  id: z.string().uuid(),
  orderName: z.string(),
  status: OrderStatusSchema,
  dateOrdered: z.string().datetime(),
  dateDelivery: z.string().datetime().nullable(),
  /** The business that's making this piece. */
  tailorBusinessName: z.string(),
  /** Latest photo thumbnail (signed, short-lived), if any. */
  thumbnailUrl: z.string().url().optional(),
  claimedAt: z.string().datetime(),
});
export type ConsumerOrderSummary = z.infer<typeof ConsumerOrderSummarySchema>;

/** GET /consumer/orders/:id — full detail for a claimed order. */
export const ConsumerOrderDetailSchema = z.object({
  order: OrderSchema,
  items: z.array(OrderItemSchema),
  photos: z.array(OrderPhotoSchema),
  events: z.array(OrderEventSchema),
  tailor: z.object({
    businessName: z.string(),
    location: z.string().nullable(),
  }),
});
export type ConsumerOrderDetail = z.infer<typeof ConsumerOrderDetailSchema>;

/**
 * One measurement set in the consumer's locker. Either the customer authored it
 * (`owned: true`, editable/deletable, `tailorBusinessName: null`) or a tailor
 * saved it for them (`owned: false`, tagged with the tailor's name, read-only).
 */
export const ConsumerMeasurementSetSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
  values: MeasurementValuesSchema,
  unitPreference: MeasurementUnitSchema,
  owned: z.boolean(),
  tailorBusinessName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ConsumerMeasurementSet = z.infer<typeof ConsumerMeasurementSetSchema>;

/** Create/replace a customer-owned measurement set (client app). */
export const ConsumerMeasurementCreateSchema = z.object({
  label: z.string().max(80).nullable().optional(),
  values: MeasurementValuesSchema,
  unitPreference: MeasurementUnitSchema.optional(),
});
export type ConsumerMeasurementCreateInput = z.infer<typeof ConsumerMeasurementCreateSchema>;

export const ConsumerMeasurementUpdateSchema = ConsumerMeasurementCreateSchema.partial();
export type ConsumerMeasurementUpdateInput = z.infer<typeof ConsumerMeasurementUpdateSchema>;
