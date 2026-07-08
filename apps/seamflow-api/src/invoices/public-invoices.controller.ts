import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { InvoicesService } from './invoices.service';

/**
 * Public invoice view backed by a signed invoice-link token. No Supabase JWT
 * required — anyone with the token can read.
 */
@Public()
@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.invoices.resolvePublic(token);
  }
}
