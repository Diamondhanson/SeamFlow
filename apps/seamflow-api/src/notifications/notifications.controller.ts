import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { DeviceTokenRegisterDto, PushTestDto } from './notifications.dto';

@Controller('me')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Register (or refresh) an Expo push token for the signed-in user.
   * Idempotent — same token re-POSTed just bumps `last_seen_at`.
   */
  @Post('device-tokens')
  @HttpCode(204)
  async register(
    @CurrentUser() user: AuthedUser,
    @Body() body: DeviceTokenRegisterDto,
  ): Promise<void> {
    await this.notifications.registerToken(user.id, body.expoToken, body.platform);
  }

  /** Drop a token (mobile calls this on sign-out). */
  @Delete('device-tokens/:expoToken')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthedUser,
    // Tokens contain `[` `]` characters but Expo's format is URL-safe enough
    // that NestJS routes them fine as a path param. We could move to a body
    // if Expo's format ever changes.
    @Param('expoToken') expoToken: string,
  ): Promise<void> {
    await this.notifications.removeToken(user.id, expoToken);
  }

  /**
   * Dev-only round-trip test. Fires a notification to every device this
   * user has registered.
   */
  @Post('push-test')
  async pushTest(
    @CurrentUser() user: AuthedUser,
    @Body() body: PushTestDto,
  ): Promise<{ sentTo: number }> {
    const title = body.title ?? 'SeamFlow';
    const msg = body.body ?? 'Test notification — your device is wired up.';
    // Await here (rather than fire-and-forget) so the response only returns
    // once we've actually attempted delivery. This is dev-only, so the
    // request latency is fine.
    const sentTo = await this.notifications.sendToUser(user.id, {
      title,
      body: msg,
      data: { type: 'push-test' },
    });
    return { sentTo };
  }
}
