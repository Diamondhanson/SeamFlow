import { createZodDto } from 'nestjs-zod';
import {
  OrderPhotoCreateSchema,
  OrderPhotoUpdateSchema,
} from '@seamflow/schemas';

export class CreateOrderPhotoDto extends createZodDto(OrderPhotoCreateSchema) {}
export class UpdateOrderPhotoDto extends createZodDto(OrderPhotoUpdateSchema) {}
