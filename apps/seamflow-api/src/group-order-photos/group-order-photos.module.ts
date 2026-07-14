import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { GroupOrderPhotosController } from './group-order-photos.controller';
import { GroupOrderPhotosService } from './group-order-photos.service';

@Module({
  imports: [TailorsModule],
  controllers: [GroupOrderPhotosController],
  providers: [GroupOrderPhotosService],
  exports: [GroupOrderPhotosService],
})
export class GroupOrderPhotosModule {}
