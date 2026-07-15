import { createZodDto } from 'nestjs-zod';
import {
  AiDescribeImageRequestSchema,
  AiSummarizeNotesRequestSchema,
} from '@seamflow/schemas';

export class DescribeImageDto extends createZodDto(AiDescribeImageRequestSchema) {}
export class SummarizeNotesDto extends createZodDto(AiSummarizeNotesRequestSchema) {}
