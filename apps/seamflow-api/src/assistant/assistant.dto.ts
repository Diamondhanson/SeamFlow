import { createZodDto } from 'nestjs-zod';
import { AssistantChatRequestSchema } from '@seamflow/schemas';

export class AssistantChatDto extends createZodDto(AssistantChatRequestSchema) {}
