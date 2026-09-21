import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportController } from './support.controller';
import { SupportStaffController } from './support-staff.controller';
import { SupportService } from './support.service';
import { StaffGuard } from './staff.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportController, SupportStaffController],
  providers: [SupportService, StaffGuard],
  exports: [SupportService],
})
export class SupportModule {}
