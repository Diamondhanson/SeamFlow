import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { ClientsModule } from '../clients/clients.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { MeasurementSetsModule } from '../measurement-sets/measurement-sets.module';
import { GroupOrdersModule } from '../group-orders/group-orders.module';
import { FabricsModule } from '../fabrics/fabrics.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantToolsService } from './assistant.tools';

@Module({
  imports: [
    TailorsModule,
    ClientsModule,
    OrdersModule,
    InvoicesModule,
    MeasurementSetsModule,
    GroupOrdersModule,
    FabricsModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantToolsService],
})
export class AssistantModule {}
