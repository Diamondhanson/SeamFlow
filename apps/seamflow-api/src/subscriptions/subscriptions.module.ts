import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { SubscriptionsService } from './subscriptions.service';
import { PlatformSettingsService } from './platform-settings.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { StaffGuard } from '../common/staff.guard';

/**
 * Exported widely on purpose: every feature that can be gated imports this to
 * ask the ONE entitlement question, rather than reading dates itself.
 */
@Module({
  imports: [TailorsModule],
  controllers: [SubscriptionsController, SubscriptionsAdminController],
  providers: [SubscriptionsService, PlatformSettingsService, StaffGuard],
  exports: [SubscriptionsService, PlatformSettingsService],
})
export class SubscriptionsModule {}
