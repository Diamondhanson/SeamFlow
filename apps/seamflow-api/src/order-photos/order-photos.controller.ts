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
import { OrderPhotosService } from './order-photos.service';
import { CreateOrderPhotoDto, UpdateOrderPhotoDto } from './order-photos.dto';

@Controller()
export class OrderPhotosController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly photos: OrderPhotosService,
  ) {}

  @Get('orders/:orderId/photos')
  async listForOrder(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.photos.listForOrder(tailorId, orderId);
    return { items };
  }

  @Post('orders/:orderId/photos')
  async createForOrder(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: CreateOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.createForOrder(tailorId, user.id, orderId, body);
  }

  @Get('order-photos/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.getById(tailorId, id);
  }

  @Patch('order-photos/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.update(tailorId, id, body);
  }

  @Delete('order-photos/:id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.photos.delete(tailorId, id);
  }
}
