import { createZodDto } from 'nestjs-zod';
import { SyncPullRequestSchema } from '@seamflow/schemas';

export class SyncPullDto extends createZodDto(SyncPullRequestSchema) {}
