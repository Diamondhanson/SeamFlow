import { createZodDto } from 'nestjs-zod';
import { LinkUnfurlInputSchema } from '@seamflow/schemas';

export class UnfurlDto extends createZodDto(LinkUnfurlInputSchema) {}
