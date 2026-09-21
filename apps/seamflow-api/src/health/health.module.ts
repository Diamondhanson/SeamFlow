import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ChatModule } from '../chat/chat.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AccountModule, ChatModule],
  controllers: [HealthController],
})
export class HealthModule {}
