import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { InvoicesService } from './invoices.service';
import { UpdateInvoiceDto } from './invoices.dto';

@Controller()
export class InvoicesController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly invoices: InvoicesService,
  ) {}

  /** Create (or open the existing) invoice for one of the caller's orders. */
  @Post('orders/:orderId/invoice')
  async createForOrder(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.invoices.createForOrder(tailorId, orderId);
  }

  @Get('invoices')
  async list(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return { items: await this.invoices.list(tailorId) };
  }

  @Get('invoices/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.invoices.getById(tailorId, id);
  }

  @Patch('invoices/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateInvoiceDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.invoices.update(tailorId, id, body);
  }

  @Delete('invoices/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.invoices.delete(tailorId, id);
  }

  /** Mint a fresh public link (marks the invoice sent on first issue). */
  @Post('invoices/:id/link')
  async link(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.invoices.issueLink(tailorId, id);
  }
}
