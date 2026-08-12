import { createZodDto } from 'nestjs-zod';
import {
  OfferCreateSchema,
  RequestCreateSchema,
  RequestQuerySchema,
  RequestUpdateSchema,
} from '@seamflow/schemas';

export class CreateRequestDto extends createZodDto(RequestCreateSchema) {}
export class UpdateRequestDto extends createZodDto(RequestUpdateSchema) {}
export class RequestQueryDto extends createZodDto(RequestQuerySchema) {}
export class CreateOfferDto extends createZodDto(OfferCreateSchema) {}
