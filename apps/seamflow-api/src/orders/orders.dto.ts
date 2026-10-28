import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  OrderCreateSchema,
  OrderStatusSchema,
  OrderTransitionSchema,
  OrderUpdateSchema,
} from '@seamflow/schemas';

export class CreateOrderDto extends createZodDto(OrderCreateSchema) {}
export class UpdateOrderDto extends createZodDto(OrderUpdateSchema) {}
export class TransitionOrderDto extends createZodDto(OrderTransitionSchema) {}

export const ListOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  clientId: z.string().uuid().optional(),
  status: OrderStatusSchema.optional(),
  groupOrderId: z.string().uuid().optional(),
  /** Free-text — currently matches orderName via trigram-backed ILIKE. */
  q: z.string().trim().min(1).optional(),
  /** ISO timestamp — only orders with dateDelivery on or before this are returned. */
  dueBefore: z.string().datetime().optional(),
  /** ISO timestamp — only orders with dateDelivery on or after this are returned. */
  dueAfter: z.string().datetime().optional(),
  /**
   * 'true' = leave out delivered orders. The "overdue" and "due this week"
   * views mean work still to do; a delivered order has no due date to miss, so
   * it must not appear there however long ago it was due.
   */
  open: z.enum(['true', 'false']).optional(),
});
export class ListOrdersQueryDto extends createZodDto(ListOrdersQuerySchema) {}
