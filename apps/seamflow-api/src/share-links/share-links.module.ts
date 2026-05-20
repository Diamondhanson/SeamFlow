import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { OrderPhotosModule } from '../order-photos/order-photos.module';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';

@Module({
  imports: [TailorsModule, OrderPhotosModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
