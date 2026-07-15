import { createZodDto } from 'nestjs-zod';
import { ConsumerClaimRequestSchema } from '@seamflow/schemas';

export class ClaimOrderDto extends createZodDto(ConsumerClaimRequestSchema) {}
