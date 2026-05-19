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
import { OrderItemsService } from './order-items.service';
import {
  CreateOrderItemDto,
  UpdateOrderItemDto,
} from './order-items.dto';

@Controller()
export class OrderItemsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly items: OrderItemsService,
  ) {}

  @Get('orders/:orderId/items')
  async listForOrder(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.items.listForOrder(tailorId, orderId);
    return { items };
  }

  @Post('orders/:orderId/items')
  async createForOrder(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: CreateOrderItemDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.items.createForOrder(tailorId, orderId, body);
  }

  @Get('order-items/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.items.getById(tailorId, id);
  }

  @Patch('order-items/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderItemDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.items.update(tailorId, id, body);
  }

  @Delete('order-items/:id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.items.delete(tailorId, id);
  }
}
