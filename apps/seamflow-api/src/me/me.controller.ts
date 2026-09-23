import { Controller, Get } from '@nestjs/common';
import type { DeletionState, SubscriptionState } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService, type TailorRow } from '../tailors/tailors.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AccountService } from '../account/account.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly account: AccountService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthedUser): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    profile: AuthedUser['profile'];
    tailor: TailorRow | null;
    deletion: DeletionState;
    /**
     * Rides along for the same reason `deletion` does: every screen already
     * calls /me on open, so the trial countdown and the premium affordances
     * are correct from the first paint without a second round trip. Null for
     * an account with no shop — the client app is free forever.
     */
    subscription: SubscriptionState | null;
  }> {
    const [tailor, deletion] = await Promise.all([
      this.tailors.getForUser(user.id),
      // Rides along with the call every screen already makes on open, so a
      // pending deletion surfaces the moment they sign back in — which is the
      // only way someone who changed their mind ever finds the cancel button.
      this.account.getState(user.id),
    ]);
    // Creates the row (and starts the six-week trial) the first time a shop
    // appears, so nothing else has to remember to.
    const subscription = tailor ? await this.subscriptions.stateFor(tailor.id) : null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      tailor,
      deletion,
      subscription,
    };
  }
}
