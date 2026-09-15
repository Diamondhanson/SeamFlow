import { createZodDto } from 'nestjs-zod';
import {
  ConsumerClaimRequestSchema,
  ConsumerMeasurementCreateSchema,
  ConsumerMeasurementUpdateSchema,
} from '@seamflow/schemas';

export class ClaimOrderDto extends createZodDto(ConsumerClaimRequestSchema) {}
export class ConsumerMeasurementCreateDto extends createZodDto(ConsumerMeasurementCreateSchema) {}
export class ConsumerMeasurementUpdateDto extends createZodDto(ConsumerMeasurementUpdateSchema) {}
