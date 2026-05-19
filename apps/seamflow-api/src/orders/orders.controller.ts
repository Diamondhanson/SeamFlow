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
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  TransitionOrderDto,
  UpdateOrderDto,
} from './orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.orders.list(tailorId, query);
    return { items, limit: query.limit, offset: query.offset };
  }

  @Post()
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateOrderDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.orders.create(tailorId, user.id, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.orders.getDetail(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.orders.update(tailorId, id, body);
  }

  @Post(':id/transition')
  async transition(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionOrderDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.orders.transition(tailorId, user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.orders.delete(tailorId, id);
  }
}
