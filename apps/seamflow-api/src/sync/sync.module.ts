import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [TailorsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
