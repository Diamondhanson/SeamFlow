import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AccountModule],
  controllers: [HealthController],
})
export class HealthModule {}
