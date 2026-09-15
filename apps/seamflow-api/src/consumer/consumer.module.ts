import { Module } from '@nestjs/common';
import { ShareLinksModule } from '../share-links/share-links.module';
import { OrderPhotosModule } from '../order-photos/order-photos.module';
import { AiModule } from '../ai/ai.module';
import { ConsumerController } from './consumer.controller';
import { ConsumerService } from './consumer.service';

@Module({
  imports: [ShareLinksModule, OrderPhotosModule, AiModule],
  controllers: [ConsumerController],
  providers: [ConsumerService],
})
export class ConsumerModule {}
