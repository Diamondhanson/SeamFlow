import { createZodDto } from 'nestjs-zod';
import {
  MeasurementSetCreateSchema,
  MeasurementSetUpdateSchema,
} from '@seamflow/schemas';

export class CreateMeasurementSetDto extends createZodDto(MeasurementSetCreateSchema) {}
export class UpdateMeasurementSetDto extends createZodDto(MeasurementSetUpdateSchema) {}
