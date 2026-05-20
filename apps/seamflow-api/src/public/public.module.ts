import { Module } from '@nestjs/common';
import { ShareLinksModule } from '../share-links/share-links.module';
import { PublicOrdersController } from './public-orders.controller';

@Module({
  imports: [ShareLinksModule],
  controllers: [PublicOrdersController],
})
export class PublicModule {}
