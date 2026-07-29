import { createZodDto } from 'nestjs-zod';
import {
  AiDescribeImageRequestSchema,
  AiExtractMeasurementsRequestSchema,
  AiSummarizeNotesRequestSchema,
} from '@seamflow/schemas';

export class DescribeImageDto extends createZodDto(AiDescribeImageRequestSchema) {}
export class SummarizeNotesDto extends createZodDto(AiSummarizeNotesRequestSchema) {}
export class ExtractMeasurementsDto extends createZodDto(
  AiExtractMeasurementsRequestSchema,
) {}
