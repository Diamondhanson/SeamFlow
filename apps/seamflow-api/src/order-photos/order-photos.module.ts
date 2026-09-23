import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TailorsModule } from '../tailors/tailors.module';
import { OrderPhotosController } from './order-photos.controller';
import { OrderPhotosService } from './order-photos.service';

@Module({
  imports: [TailorsModule, SubscriptionsModule],
  controllers: [OrderPhotosController],
  providers: [OrderPhotosService],
  exports: [OrderPhotosService],
})
export class OrderPhotosModule {}
