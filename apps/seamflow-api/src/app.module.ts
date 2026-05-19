import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { GroupOrdersModule } from './group-orders/group-orders.module';
import { GroupOrderMembersModule } from './group-order-members/group-order-members.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrderPhotosModule } from './order-photos/order-photos.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => envSchema.parse(raw),
    }),
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
    GroupOrdersModule,
    GroupOrderMembersModule,
    OrdersModule,
    OrderItemsModule,
    OrderPhotosModule,
    SyncModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
