import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { ChatService } from './chat.service';
import { CreateConversationDto, CreateMessageDto, QuoteDto } from './chat.dto';

/**
 * Chat routes (ROADMAP D.2.3). Used by BOTH apps — the caller's role is
 * resolved from their token, so there is no tailor-only or client-only variant
 * of these endpoints.
 */
@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateConversationDto) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.createConversation(actor, body);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.listConversations(actor, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.getConversation(actor, id, limit ? Number(limit) : undefined);
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.listMessages(actor, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/messages')
  async send(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateMessageDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.sendMessage(actor, id, body);
  }

  @Post(':id/read')
  async markRead(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.markRead(actor, id);
  }

  /**
   * Development only — seeds a fake inbound enquiry. Returns 403 in production.
   * Exists because nothing can create a conversation until the client app
   * ships, which would otherwise leave the whole chat path untestable.
   */
  @Post('simulate-enquiry')
  async simulate(@CurrentUser() user: AuthedUser) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.simulateEnquiry(actor);
  }

  /** Tailor-only (C3): turn a thread into an order + draft invoice. */
  @Post(':id/quote')
  async quote(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: QuoteDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.createQuote(actor, id, body);
  }
}
