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
import { GroupOrderMembersService } from './group-order-members.service';
import {
  CreateGroupOrderMemberDto,
  PromoteMemberToClientDto,
  UpdateGroupOrderMemberDto,
} from './group-order-members.dto';

@Controller()
export class GroupOrderMembersController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly members: GroupOrderMembersService,
  ) {}

  @Get('group-orders/:groupId/members')
  async listForGroup(
    @CurrentUser() user: AuthedUser,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.members.listForGroup(tailorId, groupId);
    return { items };
  }

  @Post('group-orders/:groupId/members')
  async createForGroup(
    @CurrentUser() user: AuthedUser,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() body: CreateGroupOrderMemberDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.members.createForGroup(tailorId, groupId, body);
  }

  @Get('group-order-members/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.members.getById(tailorId, id);
  }

  @Patch('group-order-members/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateGroupOrderMemberDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.members.update(tailorId, id, body);
  }

  @Delete('group-order-members/:id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.members.delete(tailorId, id);
  }

  @Post('group-order-members/:id/promote-to-client')
  async promote(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PromoteMemberToClientDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.members.promoteToClient(tailorId, id, body);
  }

  @Post('group-order-members/:id/copy-measurements-from-client')
  async copyMeasurements(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.members.copyMeasurementsFromClient(tailorId, id);
  }
}
