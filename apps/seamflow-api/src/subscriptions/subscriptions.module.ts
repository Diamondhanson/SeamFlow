import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { TailorsModule } from '../tailors/tailors.module';
import { SubscriptionsService } from './subscriptions.service';
import { PlatformSettingsModule } from './platform-settings.module';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { paymentProviderFactory } from './providers/payment-provider.factory';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { StaffGuard } from '../common/staff.guard';

/**
 * Exported widely on purpose: every feature that can be gated imports this to
 * ask the ONE entitlement question, rather than reading dates itself.
 */
@Module({
  imports: [TailorsModule, NotificationsModule, AdminModule, PlatformSettingsModule],
  controllers: [SubscriptionsController, SubscriptionsAdminController, CheckoutController],
  providers: [SubscriptionsService, CheckoutService, StaffGuard, paymentProviderFactory],
  exports: [SubscriptionsService, PlatformSettingsModule, CheckoutService],
})
export class SubscriptionsModule {}
