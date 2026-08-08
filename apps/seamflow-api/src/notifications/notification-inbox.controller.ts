import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import {
  NotificationQuerySchema,
  NotificationSettingsSchema,
  type NotificationPage,
  type NotificationSettings,
} from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { NotificationInboxService } from './notification-inbox.service';

export class NotificationQueryDto extends createZodDto(NotificationQuerySchema) {}
export class NotificationSettingsDto extends createZodDto(NotificationSettingsSchema) {}

/**
 * The inbox, for whoever is signed in. Role-neutral — the tailor app and the
 * client app hit exactly these routes.
 */
@Controller('notifications')
export class NotificationInboxController {
  constructor(private readonly inbox: NotificationInboxService) {}

  @Get()
  list(
    @CurrentUser() user: AuthedUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationPage> {
    return this.inbox.list(user.id, { cursor: query.cursor, limit: query.limit });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthedUser): Promise<{ count: number }> {
    return { count: await this.inbox.unreadCount(user.id) };
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(
    @CurrentUser() user: AuthedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ unreadCount: number }> {
    return this.inbox.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthedUser): Promise<{ unreadCount: number }> {
    return this.inbox.markAllRead(user.id);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthedUser): Promise<NotificationSettings> {
    return this.inbox.getSettings(user.id);
  }

  @Post('settings')
  @HttpCode(200)
  updateSettings(
    @CurrentUser() user: AuthedUser,
    @Body() dto: NotificationSettingsDto,
  ): Promise<NotificationSettings> {
    return this.inbox.updateSettings(user.id, dto);
  }
}
