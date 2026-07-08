import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { envSchema } from './config/env';
import { SupabaseModule } from './supabase/supabase.module';
import { DbModule } from './db/db.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { TailorsModule } from './tailors/tailors.module';
import { ClientsModule } from './clients/clients.module';
import { MeasurementSetsModule } from './measurement-sets/measurement-sets.module';
import { MeasurementTemplatesModule } from './measurement-templates/measurement-templates.module';
import { FabricsModule } from './fabrics/fabrics.module';
import { GroupOrdersModule } from './group-orders/group-orders.module';
import { GroupOrderMembersModule } from './group-order-members/group-order-members.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrderPhotosModule } from './order-photos/order-photos.module';
import { DesignsModule } from './designs/designs.module';
import { AiModule } from './ai/ai.module';
import { ShareLinksModule } from './share-links/share-links.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PublicModule } from './public/public.module';
import { SyncModule } from './sync/sync.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RemindersModule } from './notifications/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => envSchema.parse(raw),
    }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    DbModule,
    QueueModule,
    AuthModule,
    HealthModule,
    MeModule,
    TailorsModule,
    ClientsModule,
    MeasurementSetsModule,
    MeasurementTemplatesModule,
    FabricsModule,
    GroupOrdersModule,
    GroupOrderMembersModule,
    OrdersModule,
    OrderItemsModule,
    OrderPhotosModule,
    DesignsModule,
    AiModule,
    ShareLinksModule,
    InvoicesModule,
    PublicModule,
    SyncModule,
    NotificationsModule,
    RemindersModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
