import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TailorsModule } from '../tailors/tailors.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { OffersService } from './offers.service';

@Module({
  imports: [DbModule, SupabaseModule, TailorsModule, NotificationsModule],
  controllers: [RequestsController],
  providers: [RequestsService, OffersService],
  exports: [RequestsService],
})
export class RequestsModule {}
