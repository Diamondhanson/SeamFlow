import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { SupportService } from './support.service';
import { StaffGuard } from '../common/staff.guard';
import { StaffReplyDto, StaffStatusDto } from './support.dto';

/**
 * The staff side of Help & Support (plan step 2), called by the admin
 * dashboard's inbox. Lists are read by the dashboard straight from Postgres;
 * everything that WRITES, signs a screenshot or sends a push comes here, so
 * that logic lives once — beside the user-side routes it mirrors.
 */
@Controller('admin/support/tickets')
@UseGuards(StaffGuard)
export class SupportStaffController {
  constructor(private readonly support: SupportService) {}

  /** Opening a ticket in the inbox marks the user's messages as read. */
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.support.staffGet(id);
  }

  @Post(':id/messages')
  reply(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: StaffReplyDto,
  ) {
    return this.support.staffReply(user.id, id, body);
  }

  @Patch(':id')
  setStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: StaffStatusDto) {
    return this.support.staffSetStatus(id, body.status);
  }
}
