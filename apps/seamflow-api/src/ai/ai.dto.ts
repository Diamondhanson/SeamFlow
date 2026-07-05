import { createZodDto } from 'nestjs-zod';
import { AiDescribeImageRequestSchema } from '@seamflow/schemas';

export class DescribeImageDto extends createZodDto(AiDescribeImageRequestSchema) {}
