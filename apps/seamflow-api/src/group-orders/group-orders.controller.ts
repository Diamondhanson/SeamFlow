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
import { GroupOrdersService } from './group-orders.service';
import {
  CreateGroupOrderDto,
  CreateGroupOrderWithMembersDto,
  ListGroupOrdersQueryDto,
  UpdateGroupOrderDto,
} from './group-orders.dto';

@Controller('group-orders')
export class GroupOrdersController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly groups: GroupOrdersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query() query: ListGroupOrdersQueryDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.groups.list(tailorId, query);
    return { items, limit: query.limit, offset: query.offset };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateGroupOrderDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.groups.create(tailorId, body);
  }

  /**
   * Atomic create — single transaction that resolves the owner (existing
   * client or new contact) and bulk-inserts inline members. Returns the
   * group + members payload in the same shape as GET /group-orders/:id.
   */
  @Post('with-members')
  async createWithMembers(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateGroupOrderWithMembersDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.groups.createWithMembers(tailorId, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.groups.getWithMembers(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateGroupOrderDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.groups.update(tailorId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.groups.delete(tailorId, id);
  }
}
