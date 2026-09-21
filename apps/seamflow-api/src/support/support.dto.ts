import { createZodDto } from 'nestjs-zod';
import {
  SupportMessageCreateSchema,
  SupportStatusUpdateSchema,
  SupportTicketCreateSchema,
} from '@seamflow/schemas';

export class CreateTicketDto extends createZodDto(SupportTicketCreateSchema) {}
export class CreateSupportMessageDto extends createZodDto(SupportMessageCreateSchema) {}
export class UpdateTicketStatusDto extends createZodDto(SupportStatusUpdateSchema) {}
