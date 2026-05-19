import { z } from 'zod';
import { MeasurementValuesSchema } from './measurement';

export const OrderStatusSchema = z.enum([
  'registered',
  'in_progress',
  'testing',
  'on_pause',
  'delivered',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// ============================================================================
// Order status state machine
// Enforced on server (rejected 409) and surfaced in client UI (which buttons
// to show next). Reopen-after-delivered is allowed for the rework case.
// ============================================================================

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  registered: ['in_progress'],
  in_progress: ['testing', 'on_pause'],
  testing: ['in_progress', 'delivered'],
  on_pause: ['in_progress'],
  delivered: ['in_progress'],
};

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function nextOrderStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from];
}

// ============================================================================
// Row schemas
// ============================================================================

export const OrderSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  clientId: z.string().uuid(),
  groupOrderId: z.string().uuid().nullable(),
  groupOrderMemberId: z.string().uuid().nullable(),
  orderName: z.string().min(1),
  dateOrdered: z.string().datetime(),
  dateDelivery: z.string().datetime().nullable(),
  status: OrderStatusSchema,
  notes: z.string().nullable(),
  totalAmount: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  garmentType: z.string(),
  measurements: MeasurementValuesSchema.nullable(),
  notes: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.string().nullable(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

/** Append-only audit row from public.order_events. */
export const OrderEventSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  eventType: z.string(),
  fromStatus: OrderStatusSchema.nullable(),
  toStatus: OrderStatusSchema.nullable(),
  payload: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});
export type OrderEvent = z.infer<typeof OrderEventSchema>;

/** Detail response: order + embedded items + recent events. */
export type OrderDetail = Order & { items: OrderItem[]; events: OrderEvent[] };

// ============================================================================
// Input DTOs (camelCase to match the rest of the API)
// ============================================================================

/** Single line-item inline-creatable with the order. */
export const OrderItemCreateSchema = z.object({
  garmentType: z.string().min(1),
  measurements: MeasurementValuesSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
});
export type OrderItemCreateInput = z.infer<typeof OrderItemCreateSchema>;

export const OrderItemUpdateSchema = OrderItemCreateSchema.partial();
export type OrderItemUpdateInput = z.infer<typeof OrderItemUpdateSchema>;

/** Body schema for POST /orders. tailorId resolves from auth. */
export const OrderCreateSchema = z.object({
  clientId: z.string().uuid(),
  groupOrderId: z.string().uuid().nullable().optional(),
  groupOrderMemberId: z.string().uuid().nullable().optional(),
  orderName: z.string().min(1),
  dateOrdered: z.string().datetime().optional(),
  dateDelivery: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  items: z.array(OrderItemCreateSchema).optional(),
});
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;

/**
 * Body for PATCH /orders/:id. Status is intentionally NOT here — use
 * POST /orders/:id/transition for status changes (logs to order_events).
 */
export const OrderUpdateSchema = OrderCreateSchema.omit({
  clientId: true,
  items: true,
}).partial();
export type OrderUpdateInput = z.infer<typeof OrderUpdateSchema>;

/** Body for POST /orders/:id/transition. */
export const OrderTransitionSchema = z.object({
  to: OrderStatusSchema,
  note: z.string().nullable().optional(),
});
export type OrderTransitionInput = z.infer<typeof OrderTransitionSchema>;
