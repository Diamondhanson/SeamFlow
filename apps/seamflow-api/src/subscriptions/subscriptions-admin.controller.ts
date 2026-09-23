import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { GrantDaysSchema } from '@seamflow/schemas';
import { StaffGuard } from '../common/staff.guard';
import { SubscriptionsService } from './subscriptions.service';
import { ENFORCEMENT_KEY, PlatformSettingsService } from './platform-settings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';

class GrantDaysDto extends createZodDto(GrantDaysSchema) {}

/**
 * The levers behind the ops dashboard (appendix I).
 *
 * Deliberately only ever ADDS or REMOVES DAYS. There is no "make this tailor
 * premium forever" and no way to edit a payment: everything that moves the one
 * date leaves a trail, and a mistake is undone by granting negative days rather
 * than by rewriting history.
 *
 * `extend-all` is the safety net for the launch itself: if a payment provider
 * slips, every trial moves together, in one click, rather than 17 tailors
 * hitting the Free tier with nothing to buy.
 */
@Controller('admin/subscriptions')
@UseGuards(StaffGuard)
export class SubscriptionsAdminController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly settings: PlatformSettingsService,
  ) {}

  /**
   * The paywall switch. Off until payments work; flipping it on is what makes
   * the Free caps and premium gates start refusing. Reading it is cheap and
   * the dashboard shows it as a toggle.
   */
  @Get('enforcement')
  async enforcement() {
    return { enforced: await this.subscriptions.enforced() };
  }

  @Post('enforcement')
  async setEnforcement(@CurrentUser() user: AuthedUser, @Body() body: { enforced: boolean }) {
    await this.settings.set(ENFORCEMENT_KEY, body.enforced === true, user.id);
    return { enforced: await this.subscriptions.enforced() };
  }

  /** Give (or take back) paid days — a friend, an apology, a manual payment. */
  @Post(':tailorId/grant')
  async grant(
    @Param('tailorId', new ParseUUIDPipe()) tailorId: string,
    @Body() body: GrantDaysDto,
  ) {
    const row = await this.subscriptions.extendPremium(tailorId, body.days, {
      reason: body.reason ?? 'admin grant',
    });
    return { premiumUntil: row.premiumUntil, status: row.status };
  }

  /** Move one tailor's trial end date. */
  @Post(':tailorId/trial')
  async trial(
    @Param('tailorId', new ParseUUIDPipe()) tailorId: string,
    @Body() body: GrantDaysDto,
  ) {
    const row = await this.subscriptions.extendTrial(tailorId, body.days);
    return { trialEndsAt: row.trialEndsAt, status: row.status };
  }

  /** Move every trial at once. */
  @Post('trials/extend-all')
  async extendAll(@Body() body: GrantDaysDto) {
    return { updated: await this.subscriptions.extendAllTrials(body.days) };
  }
}
