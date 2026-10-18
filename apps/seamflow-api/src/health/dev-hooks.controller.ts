import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AccountPurgeService } from '../account/account-purge.service';
import { ChatMediaRetentionService } from '../chat/chat-media-retention.service';
import { VerificationRetentionService } from '../verification/verification-retention.service';
import { TrustSignalsService } from '../verification/trust-signals.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CheckoutService } from '../subscriptions/checkout.service';
import { Public } from '../auth/decorators/public.decorator';
import { LocalTargetGuard } from './local-target.guard';

/**
 * Unauthenticated test hooks: drive months of calendar in seconds, run a cron
 * now, purge an account without waiting 30 days.
 *
 * THESE ROUTES DO NOT EXIST IN PRODUCTION. `HealthModule` only registers this
 * controller when NODE_ENV is not 'production', so there is nothing to reach
 * and nothing to forget.
 *
 * It used to be one `if (process.env.NODE_ENV === 'production') throw` at the
 * top of each of the nine handlers. That worked — a live probe confirmed all
 * nine answered 404 — but it failed open in two ways. A tenth hook that
 * forgot the line would be an unauthenticated endpoint that destroys accounts
 * or grants paid subscriptions. And `envSchema` DEFAULTS NODE_ENV to
 * 'development', so an unset or misspelled Render variable opened all nine at
 * once: the safe behaviour depended on a value being present, not absent.
 *
 * Registration is the right gate because it inverts that. The unsafe state now
 * requires someone to deliberately run the API with NODE_ENV != production,
 * and a new hook added to this file is covered the moment it is written.
 */
@SkipThrottle()
@Public()
// Every route here destroys, grants or sends something real. The guard refuses
// to act on a remote Supabase project unless told to in words — see the file.
@UseGuards(LocalTargetGuard)
@Controller('health')
export class DevHooksController {
  constructor(
    private readonly purge: AccountPurgeService,
    private readonly retention: ChatMediaRetentionService,
    private readonly verificationRetention: VerificationRetentionService,
    private readonly trustSignals: TrustSignalsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly checkout: CheckoutService,
  ) {}

  /**
   * Run the account purge now instead of waiting for 03:20.
   *
   * DEVELOPMENT ONLY — it 404s in production, and must stay that way: an
   * unauthenticated endpoint that permanently destroys accounts is exactly the
   * thing you do not want reachable from the internet. It exists so the
   * deletion test can prove the purge works without a 30-day wait.
   */
  @Post('run-purge')
  async runPurge(): Promise<{ ran: true }> {
    await this.purge.purgeDue();
    return { ran: true };
  }

  /** Same rules as run-purge: test hook for the chat photo retention job. */
  @Post('run-media-retention')
  async runMediaRetention(): Promise<{ removed: number }> {
    return { removed: await this.retention.run() };
  }

  /**
   * Same rules again: test hook for the verification evidence sweep.
   *
   * Worth having its own hook rather than folding it into the one above: the
   * promise it keeps ("we delete these photos 90 days after we decide") is made
   * to a person in the app's own words, and a test that can prove it must not
   * depend on a cron firing at 04:20.
   */
  @Post('run-verification-retention')
  async runVerificationRetention(): Promise<{ cleared: number }> {
    return { cleared: await this.verificationRetention.run() };
  }

  /**
   * Same rules: recompute the trust signals now rather than at 03:10.
   *
   * Also the only way to fill them in for the first time on an environment that
   * has been running since before phase 2 — otherwise every shop reads zero
   * orders and no reply time until the cron next fires.
   */
  @Post('run-trust-signals')
  async runTrustSignals(): Promise<{ orders: number; replies: number }> {
    return this.trustSignals.run();
  }
  /**
   * Dev-only subscription hooks (404 in production, like run-purge). They let
   * the entitlement test drive months of calendar in seconds — granting days,
   * simulating a provider's confirmation, running the nightly job — without
   * waiting for real time to pass or a payment provider to exist.
   */
  @Post('subscription-grant')
  async grant(@Body() body: { tailorId: string; days: number; trial?: boolean }) {
    const row = body.trial
      ? await this.subscriptions.extendTrial(body.tailorId, body.days)
      : await this.subscriptions.extendPremium(body.tailorId, body.days, { reason: 'dev hook' });
    return { trialEndsAt: row.trialEndsAt, premiumUntil: row.premiumUntil, status: row.status };
  }

  @Post('subscription-pay')
  async pay(@Body() body: { tailorId: string; plan: 'monthly' | 'quarterly' | 'annual'; providerRef: string }) {
    const { applied, row } = await this.subscriptions.recordPayment({
      tailorId: body.tailorId,
      plan: body.plan,
      method: 'mtn_momo',
      amount: 0,
      provider: 'dev-hook',
      providerRef: body.providerRef,
    });
    return { applied, premiumUntil: row.premiumUntil, status: row.status };
  }

  /** Dev-only: run the renewal reminder job now instead of waiting for 09:00. */
  @Post('subscription-reminders')
  async runReminders() {
    return this.subscriptions.renewalReminders();
  }

  /** Dev-only: ask the provider about pending payments now. */
  @Post('subscription-reconcile')
  async reconcile() {
    return this.checkout.reconcilePending();
  }

  @Post('subscription-sync')
  async syncSubscriptions() {
    return { created: await this.subscriptions.ensureAll(), lapsed: await this.subscriptions.syncStatuses() };
  }
}
