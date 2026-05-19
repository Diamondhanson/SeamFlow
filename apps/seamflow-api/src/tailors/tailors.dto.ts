import { createZodDto } from 'nestjs-zod';
import { TailorUpsertSchema } from '@seamflow/schemas';

export class UpsertTailorDto extends createZodDto(TailorUpsertSchema) {}
