import { createZodDto } from 'nestjs-zod';
import {
  SupportMessageCreateSchema,
  SupportStaffReplySchema,
  SupportStaffStatusSchema,
  SupportStatusUpdateSchema,
  SupportTicketCreateSchema,
} from '@seamflow/schemas';

export class CreateTicketDto extends createZodDto(SupportTicketCreateSchema) {}
export class CreateSupportMessageDto extends createZodDto(SupportMessageCreateSchema) {}
export class UpdateTicketStatusDto extends createZodDto(SupportStatusUpdateSchema) {}
export class StaffReplyDto extends createZodDto(SupportStaffReplySchema) {}
export class StaffStatusDto extends createZodDto(SupportStaffStatusSchema) {}
