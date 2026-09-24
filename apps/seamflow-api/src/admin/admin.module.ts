import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminPeopleController } from './admin-people.controller';
import { AdminPeopleService } from './admin-people.service';
import { AdminAuditService } from './admin-audit.service';
import { StaffGuard } from '../common/staff.guard';

/**
 * The ops dashboard's write surface for people and posts. Reads still go
 * straight to Postgres from the dashboard (they are all aggregates); anything
 * that CHANGES something comes through here, as the signed-in staff member,
 * so it can be checked and recorded in one place.
 */
@Module({
  imports: [AccountModule, NotificationsModule],
  controllers: [AdminPeopleController],
  providers: [AdminPeopleService, AdminAuditService, StaffGuard],
  exports: [AdminAuditService],
})
export class AdminModule {}
