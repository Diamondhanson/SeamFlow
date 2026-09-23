import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { AccountModule } from '../account/account.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MeController } from './me.controller';

@Module({
  imports: [TailorsModule, AccountModule, SubscriptionsModule],
  controllers: [MeController],
})
export class MeModule {}
