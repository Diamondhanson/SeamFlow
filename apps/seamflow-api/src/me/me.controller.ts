import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { DeletionState, SubscriptionState } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService, type TailorRow } from '../tailors/tailors.service';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { users } from '../db/schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AccountService } from '../account/account.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly account: AccountService,
    private readonly subscriptions: SubscriptionsService,
    private readonly dbService: DbService,
  ) {}

  /**
   * Consent for subscription emails.
   *
   * Its own endpoint rather than part of notification preferences, because
   * those are about pushes for orders; this is permission to write to someone
   * about money, which Apple requires be given and revocable.
   */
  @Patch('emails')
  async setEmailConsent(
    @CurrentUser() user: AuthedUser,
    @Body() body: { subscriptionEmails: boolean },
  ): Promise<{ subscriptionEmails: boolean }> {
    const value = body.subscriptionEmails === true;
    await this.dbService.db
      .update(users)
      .set({ subscriptionEmailsOptIn: value, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return { subscriptionEmails: value };
  }

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
    /**
     * Set while this account may not write. The app shows it as a banner and
     * explains the refusals; without it a suspended tailor would just find
     * that nothing works and no screen would say why.
     */
    suspension: { since: string; reason: string | null } | null;
  }> {
    const [tailor, deletion, suspension] = await Promise.all([
      this.tailors.getForUser(user.id),
      // Rides along with the call every screen already makes on open, so a
      // pending deletion surfaces the moment they sign back in — which is the
      // only way someone who changed their mind ever finds the cancel button.
      this.account.getState(user.id),
      this.account.suspensionFor(user.id),
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
      suspension,
    };
  }
}
