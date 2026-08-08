import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { WorksModule } from '../works/works.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [TailorsModule, WorksModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
