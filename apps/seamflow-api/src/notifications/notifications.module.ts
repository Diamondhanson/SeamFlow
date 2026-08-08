import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationInboxController } from './notification-inbox.controller';
import { NotificationInboxService } from './notification-inbox.service';

/**
 * Two things live here and they are not the same thing:
 *
 *   NotificationPreferences  tailor-only reminder SCHEDULING (lead days,
 *                            reminder hour, timezone). Meaningless to a client.
 *   NotificationInbox        the role-neutral durable record + per-user mutes.
 */
@Module({
  imports: [TailorsModule],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    NotificationInboxController,
  ],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationInboxService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationInboxService,
  ],
})
export class NotificationsModule {}
