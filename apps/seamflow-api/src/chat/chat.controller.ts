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
import {
  CreateConversationDto,
  CreateMessageDto,
  HydrateDto,
  QuoteDto,
  ReactionDto,
  SaveMeasurementDto,
  ShareOrderDto,
} from './chat.dto';

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
    @Query('since') since?: string,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.listMessages(actor, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      since,
    });
  }

  /** Refresh specific messages — the device's way to renew expiring photo links. */
  @Post(':id/messages/hydrate')
  async hydrate(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: HydrateDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return { items: await this.chat.hydrateMessages(actor, id, body.ids) };
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

  /** Toggle the caller's emoji reaction on a message. */
  @Post(':id/messages/:messageId/reactions')
  async react(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() body: ReactionDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.toggleReaction(actor, id, messageId, body.emoji);
  }

  /** Tailor-only: share an existing order into the thread + claim it for the client. */
  @Post(':id/share-order')
  async shareOrder(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ShareOrderDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.shareOrder(actor, id, body);
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

  /**
   * Tailor-only: keep a measurement the client sent, in this client's file.
   * Also links the thread to that client, so the next one is a single tap.
   */
  @Post(':id/measurement-set')
  async saveMeasurement(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SaveMeasurementDto,
  ) {
    const actor = await this.chat.resolveActor(user.id);
    return this.chat.saveMeasurement(actor, id, body);
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
