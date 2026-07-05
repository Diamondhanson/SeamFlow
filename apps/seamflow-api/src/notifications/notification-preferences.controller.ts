import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './notification-preferences.dto';

@Controller('me/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly prefs: NotificationPreferencesService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.prefs.getOrCreate(tailorId);
  }

  @Patch()
  async update(
    @CurrentUser() user: AuthedUser,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.prefs.update(tailorId, body);
  }
}
