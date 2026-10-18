import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ChatModule } from '../chat/chat.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { VerificationModule } from '../verification/verification.module';
import { FeedModule } from '../feed/feed.module';
import { HealthController } from './health.controller';
import { DevHooksController } from './dev-hooks.controller';
import { LocalTargetGuard } from './local-target.guard';

/**
 * The dev-only test hooks are registered CONDITIONALLY. In production the
 * controller is never added, so its routes do not exist — see the comment in
 * dev-hooks.controller.ts for why that beats a check inside each handler.
 *
 * Read from process.env rather than ConfigService because module metadata is
 * evaluated before the DI container exists.
 */
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [AccountModule, ChatModule, SubscriptionsModule, VerificationModule, FeedModule],
  controllers: isProduction ? [HealthController] : [HealthController, DevHooksController],
  providers: isProduction ? [] : [LocalTargetGuard],
})
export class HealthModule {}
