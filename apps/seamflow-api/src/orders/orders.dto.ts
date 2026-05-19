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
});
export class ListOrdersQueryDto extends createZodDto(ListOrdersQuerySchema) {}
