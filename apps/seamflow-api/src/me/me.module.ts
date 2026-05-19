import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { MeController } from './me.controller';

@Module({
  imports: [TailorsModule],
  controllers: [MeController],
})
export class MeModule {}
