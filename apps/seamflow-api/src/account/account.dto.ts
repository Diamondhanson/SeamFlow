import { createZodDto } from 'nestjs-zod';
import { RequestDeletionSchema } from '@seamflow/schemas';

export class RequestDeletionDto extends createZodDto(RequestDeletionSchema) {}
