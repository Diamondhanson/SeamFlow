import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { MeasurementSetsController } from './measurement-sets.controller';
import { MeasurementSetsService } from './measurement-sets.service';

@Module({
  imports: [TailorsModule],
  controllers: [MeasurementSetsController],
  providers: [MeasurementSetsService],
  exports: [MeasurementSetsService],
})
export class MeasurementSetsModule {}
