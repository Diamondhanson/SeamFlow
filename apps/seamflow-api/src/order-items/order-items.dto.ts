import { createZodDto } from 'nestjs-zod';
import {
  OrderItemCreateSchema,
  OrderItemUpdateSchema,
} from '@seamflow/schemas';

export class CreateOrderItemDto extends createZodDto(OrderItemCreateSchema) {}
export class UpdateOrderItemDto extends createZodDto(OrderItemUpdateSchema) {}
