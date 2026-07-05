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
import { DesignsService } from './designs.service';
import {
  CreateDesignDto,
  UpdateDesignDto,
  AttachDesignToOrderDto,
} from './designs.dto';

@Controller('designs')
export class DesignsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly designs: DesignsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.designs.list(tailorId);
    return { items };
  }

  @Post()
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateDesignDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.designs.create(tailorId, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.designs.getById(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDesignDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.designs.update(tailorId, id, body);
  }

  @Post(':id/attach-to-order')
  async attachToOrder(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AttachDesignToOrderDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.designs.attachToOrder(tailorId, user.id, id, body.orderId);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.designs.delete(tailorId, id);
  }
}
