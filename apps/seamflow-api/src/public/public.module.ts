import { Module } from '@nestjs/common';
import { FeedModule } from '../feed/feed.module';
import { ShareLinksModule } from '../share-links/share-links.module';
import { PublicCatalogueController } from './public-catalogue.controller';
import { PublicOrdersController } from './public-orders.controller';

@Module({
  imports: [ShareLinksModule, FeedModule],
  controllers: [PublicOrdersController, PublicCatalogueController],
})
export class PublicModule {}
