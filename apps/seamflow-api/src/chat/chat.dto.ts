import { createZodDto } from 'nestjs-zod';
import {
  ConversationCreateSchema,
  ConversationQuoteSchema,
  MessageCreateSchema,
} from '@seamflow/schemas';

export class CreateConversationDto extends createZodDto(ConversationCreateSchema) {}
export class CreateMessageDto extends createZodDto(MessageCreateSchema) {}
export class QuoteDto extends createZodDto(ConversationQuoteSchema) {}
