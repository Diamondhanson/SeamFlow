import { createZodDto } from 'nestjs-zod';
import { NotificationPreferencesUpdateSchema } from '@seamflow/schemas';

export class UpdateNotificationPreferencesDto extends createZodDto(
  NotificationPreferencesUpdateSchema,
) {}
