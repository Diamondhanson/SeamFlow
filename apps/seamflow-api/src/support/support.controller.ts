import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { SupportService } from './support.service';
import { CreateSupportMessageDto, CreateTicketDto, UpdateTicketStatusDto } from './support.dto';

/**
 * Help & Support, user side (plan step 1). Both apps use these; a ticket is
 * always scoped to the signed-in user. The staff side lives in the admin
 * inbox (step 2), not here.
 */
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.support.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() body: CreateTicketDto) {
    return this.support.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.support.get(user.id, id);
  }

  @Post(':id/messages')
  reply(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateSupportMessageDto,
  ) {
    return this.support.reply(user.id, id, body);
  }

  @Patch(':id')
  resolve(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _body: UpdateTicketStatusDto,
  ) {
    return this.support.resolve(user.id, id);
  }
}
