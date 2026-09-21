import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMediaRetentionService } from './chat-media-retention.service';

@Module({
  imports: [NotificationsModule, OrdersModule, InvoicesModule, ClientsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatMediaRetentionService],
  exports: [ChatService, ChatMediaRetentionService],
})
export class ChatModule {}
