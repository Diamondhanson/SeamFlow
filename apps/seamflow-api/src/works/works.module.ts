import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

@Module({
  imports: [TailorsModule],
  controllers: [WorksController],
  providers: [WorksService],
  exports: [WorksService],
})
export class WorksModule {}
