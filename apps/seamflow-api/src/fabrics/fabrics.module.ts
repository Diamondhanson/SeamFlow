import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { FabricsController } from './fabrics.controller';
import { FabricsService } from './fabrics.service';

@Module({
  imports: [TailorsModule],
  controllers: [FabricsController],
  providers: [FabricsService],
  exports: [FabricsService],
})
export class FabricsModule {}
