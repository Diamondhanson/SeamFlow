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
import { GroupOrderPhotosService } from './group-order-photos.service';
import {
  CreateGroupOrderPhotoDto,
  UpdateGroupOrderPhotoDto,
} from './group-order-photos.dto';

@Controller()
export class GroupOrderPhotosController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly photos: GroupOrderPhotosService,
  ) {}

  @Get('group-orders/:groupOrderId/photos')
  async listForGroup(
    @CurrentUser() user: AuthedUser,
    @Param('groupOrderId', new ParseUUIDPipe()) groupOrderId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.photos.listForGroup(tailorId, groupOrderId);
    return { items };
  }

  @Post('group-orders/:groupOrderId/photos')
  async createForGroup(
    @CurrentUser() user: AuthedUser,
    @Param('groupOrderId', new ParseUUIDPipe()) groupOrderId: string,
    @Body() body: CreateGroupOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.createForGroup(tailorId, user.id, groupOrderId, body);
  }

  @Get('group-order-photos/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.getById(tailorId, id);
  }

  @Patch('group-order-photos/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateGroupOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.photos.update(tailorId, id, body);
  }

  @Delete('group-order-photos/:id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.photos.delete(tailorId, id);
  }
}
