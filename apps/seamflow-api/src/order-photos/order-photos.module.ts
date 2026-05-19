import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { OrderPhotosController } from './order-photos.controller';
import { OrderPhotosService } from './order-photos.service';

@Module({
  imports: [TailorsModule],
  controllers: [OrderPhotosController],
  providers: [OrderPhotosService],
  exports: [OrderPhotosService],
})
export class OrderPhotosModule {}
