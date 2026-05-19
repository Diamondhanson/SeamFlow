import { createZodDto } from 'nestjs-zod';
import {
  MeasurementTemplateCreateSchema,
  MeasurementTemplateUpdateSchema,
} from '@seamflow/schemas';

export class CreateMeasurementTemplateDto extends createZodDto(
  MeasurementTemplateCreateSchema,
) {}
export class UpdateMeasurementTemplateDto extends createZodDto(
  MeasurementTemplateUpdateSchema,
) {}
