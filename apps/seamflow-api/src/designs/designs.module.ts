import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';

@Module({
  imports: [TailorsModule],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}
