import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ChatModule } from '../chat/chat.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { VerificationModule } from '../verification/verification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AccountModule, ChatModule, SubscriptionsModule, VerificationModule],
  controllers: [HealthController],
})
export class HealthModule {}
