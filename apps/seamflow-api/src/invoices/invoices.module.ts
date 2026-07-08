import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { InvoicesController } from './invoices.controller';
import { PublicInvoicesController } from './public-invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TailorsModule],
  controllers: [InvoicesController, PublicInvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
