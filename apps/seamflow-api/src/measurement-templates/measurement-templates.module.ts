import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { MeasurementTemplatesController } from './measurement-templates.controller';
import { MeasurementTemplatesService } from './measurement-templates.service';

@Module({
  imports: [TailorsModule],
  controllers: [MeasurementTemplatesController],
  providers: [MeasurementTemplatesService],
  exports: [MeasurementTemplatesService],
})
export class MeasurementTemplatesModule {}
