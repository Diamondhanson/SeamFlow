import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { RemindersService } from './reminders.service';

// Hosts the hourly order-due reminder cron. Kept separate from the HTTP
// notifications module so the scheduler is easy to find and disable.
@Module({
  imports: [NotificationsModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
