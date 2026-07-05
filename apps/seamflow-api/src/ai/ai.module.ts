import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TailorsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
