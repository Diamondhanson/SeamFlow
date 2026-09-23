import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { SubscriptionState } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * What the app shows: the trial countdown, the upgrade screen's "you have X
 * of 25 clients", and whether premium affordances are visible. Display only —
 * every gate is enforced server-side (appendix I.9).
 */
@Controller('me/subscription')
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly tailors: TailorsService,
  ) {}

  @Get()
  async mine(@CurrentUser() user: AuthedUser): Promise<SubscriptionState> {
    const tailor = await this.tailors.getForUser(user.id);
    // Only a tailor has a subscription; the client app is free forever.
    if (!tailor) throw new NotFoundException('No tailor profile for this account');
    return this.subscriptions.stateFor(tailor.id);
  }
}
