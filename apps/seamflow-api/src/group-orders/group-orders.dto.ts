import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  GroupOrderCreateSchema,
  GroupOrderStatusSchema,
  GroupOrderUpdateSchema,
} from '@seamflow/schemas';

export class CreateGroupOrderDto extends createZodDto(GroupOrderCreateSchema) {}
export class UpdateGroupOrderDto extends createZodDto(GroupOrderUpdateSchema) {}

export const ListGroupOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: GroupOrderStatusSchema.optional(),
});
export class ListGroupOrdersQueryDto extends createZodDto(ListGroupOrdersQuerySchema) {}
