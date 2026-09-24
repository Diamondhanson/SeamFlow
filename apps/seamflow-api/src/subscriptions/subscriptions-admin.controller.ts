import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { defaultPrices, GrantDaysSchema, PriceTableSchema } from '@seamflow/schemas';
import { StaffGuard } from '../common/staff.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutService } from './checkout.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ENFORCEMENT_KEY, PRICES_KEY, PlatformSettingsService } from './platform-settings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';

class GrantDaysDto extends createZodDto(GrantDaysSchema) {}
class PricesDto extends createZodDto(PriceTableSchema) {}

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
    private readonly checkout: CheckoutService,
    private readonly audit: AdminAuditService,
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
    await this.audit.record(user.id, 'platform.enforcement', { type: 'platform' }, {
      enforced: body.enforced === true,
    });
    return { enforced: await this.subscriptions.enforced() };
  }

  /**
   * What the platform charges.
   *
   * `defaults` comes back alongside so the dashboard can show what this build
   * would fall back to, and offer a way back to it. A tailor mid-checkout is
   * unaffected: the amount was decided and recorded when their attempt was
   * created, and the provider collects that.
   */
  @Get('prices')
  async prices() {
    return { prices: await this.settings.prices(), defaults: defaultPrices() };
  }

  @Post('prices')
  async setPrices(@CurrentUser() user: AuthedUser, @Body() body: PricesDto) {
    const before = await this.settings.prices();
    await this.settings.set(PRICES_KEY, body, user.id);
    await this.audit.record(user.id, 'platform.prices', { type: 'platform' }, { before, after: body });
    return { prices: await this.settings.prices() };
  }

  /** Recent payment attempts across the platform, newest first. */
  @Get('payments')
  async payments() {
    return { items: await this.checkout.recent(100) };
  }

  /**
   * Ask the provider about one pending payment now, rather than waiting for
   * the ten-minute sweep. Settles through the same path a webhook would.
   */
  @Post('payments/:paymentId/recheck')
  async recheck(@Param('paymentId', new ParseUUIDPipe()) paymentId: string) {
    return this.checkout.recheck(paymentId);
  }

  /** Give (or take back) paid days — a friend, an apology, a manual payment. */
  @Post(':tailorId/grant')
  async grant(
    @CurrentUser() user: AuthedUser,
    @Param('tailorId', new ParseUUIDPipe()) tailorId: string,
    @Body() body: GrantDaysDto,
  ) {
    const row = await this.subscriptions.extendPremium(tailorId, body.days, {
      reason: body.reason ?? 'admin grant',
    });
    await this.audit.record(user.id, 'tailor.grant_days', { type: 'tailor', id: tailorId }, {
      days: body.days,
      reason: body.reason ?? null,
      premiumUntil: row.premiumUntil,
    });
    return { premiumUntil: row.premiumUntil, status: row.status };
  }

  /** Move one tailor's trial end date. */
  @Post(':tailorId/trial')
  async trial(
    @CurrentUser() user: AuthedUser,
    @Param('tailorId', new ParseUUIDPipe()) tailorId: string,
    @Body() body: GrantDaysDto,
  ) {
    const row = await this.subscriptions.extendTrial(tailorId, body.days);
    await this.audit.record(user.id, 'tailor.extend_trial', { type: 'tailor', id: tailorId }, {
      days: body.days,
      trialEndsAt: row.trialEndsAt,
    });
    return { trialEndsAt: row.trialEndsAt, status: row.status };
  }

  /** Move every trial at once. */
  @Post('trials/extend-all')
  async extendAll(@CurrentUser() user: AuthedUser, @Body() body: GrantDaysDto) {
    const updated = await this.subscriptions.extendAllTrials(body.days);
    await this.audit.record(user.id, 'platform.extend_all_trials', { type: 'platform' }, {
      days: body.days,
      updated,
    });
    return { updated };
  }
}
