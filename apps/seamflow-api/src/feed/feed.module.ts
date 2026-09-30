import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { WorksModule } from '../works/works.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { DesignTagBackfillService } from './design-tag-backfill.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TailorsModule, WorksModule, AiModule],
  controllers: [FeedController],
  providers: [FeedService, DesignTagBackfillService],
  exports: [FeedService, DesignTagBackfillService],
})
export class FeedModule {}
