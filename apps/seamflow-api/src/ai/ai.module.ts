import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TailorsModule } from '../tailors/tailors.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TailorsModule, SubscriptionsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
