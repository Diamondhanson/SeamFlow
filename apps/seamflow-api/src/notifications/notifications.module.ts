import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  imports: [TailorsModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationPreferencesService],
  exports: [NotificationsService, NotificationPreferencesService],
})
export class NotificationsModule {}
