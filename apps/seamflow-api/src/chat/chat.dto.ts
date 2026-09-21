import { createZodDto } from 'nestjs-zod';
import {
  ConversationCreateSchema,
  ConversationQuoteSchema,
  MessageCreateSchema,
  MessageHydrateSchema,
  MessageReactionInputSchema,
  ShareOrderInputSchema,
} from '@seamflow/schemas';

export class CreateConversationDto extends createZodDto(ConversationCreateSchema) {}
export class CreateMessageDto extends createZodDto(MessageCreateSchema) {}
export class QuoteDto extends createZodDto(ConversationQuoteSchema) {}
export class ReactionDto extends createZodDto(MessageReactionInputSchema) {}
export class ShareOrderDto extends createZodDto(ShareOrderInputSchema) {}
export class HydrateDto extends createZodDto(MessageHydrateSchema) {}
