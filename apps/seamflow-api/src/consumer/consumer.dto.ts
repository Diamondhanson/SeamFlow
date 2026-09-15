import { createZodDto } from 'nestjs-zod';
import {
  ConsumerClaimRequestSchema,
  ConsumerMeasurementCreateSchema,
  ConsumerMeasurementUpdateSchema,
  ConsumerScanInputSchema,
} from '@seamflow/schemas';

export class ClaimOrderDto extends createZodDto(ConsumerClaimRequestSchema) {}
export class ConsumerMeasurementCreateDto extends createZodDto(ConsumerMeasurementCreateSchema) {}
export class ConsumerMeasurementUpdateDto extends createZodDto(ConsumerMeasurementUpdateSchema) {}
export class ConsumerScanDto extends createZodDto(ConsumerScanInputSchema) {}
