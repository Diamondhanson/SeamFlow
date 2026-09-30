import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { QueueService } from '../queue/queue.service';
import { AccountPurgeService } from '../account/account-purge.service';
import { ChatMediaRetentionService } from '../chat/chat-media-retention.service';
import { VerificationRetentionService } from '../verification/verification-retention.service';
import { TrustSignalsService } from '../verification/trust-signals.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CheckoutService } from '../subscriptions/checkout.service';
import { sentryEnabled } from '../common/sentry';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

type HealthStatus = 'up' | 'down' | 'not_configured' | 'disabled';

interface HealthResponse {
  ok: true;
  version: string;
  /**
   * Short SHA of the commit this process was built from, or 'unknown' locally.
   *
   * Exists because "did my deploy actually land?" was otherwise unanswerable:
   * `version` is always '0.0.0' (npm_package_version is unset when the app runs
   * as `node dist/main.js`), and `uptime_s` resets on a free-tier spin-down as
   * well as on a deploy, so neither distinguishes a new build from a wake-up.
   */
  commit: string;
  uptime_s: number;
  db: HealthStatus;
  redis: HealthStatus;
  sentry: 'enabled' | 'disabled';
}

// Render polls this; it must never be the thing that fails a health check.
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DbService,
    private readonly queue: QueueService,
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
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    await this.purge.purgeDue();
    return { ran: true };
  }

  /** Same rules as run-purge: test hook for the chat photo retention job. */
  @Post('run-media-retention')
  async runMediaRetention(): Promise<{ removed: number }> {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
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
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
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
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
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
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    const row = body.trial
      ? await this.subscriptions.extendTrial(body.tailorId, body.days)
      : await this.subscriptions.extendPremium(body.tailorId, body.days, { reason: 'dev hook' });
    return { trialEndsAt: row.trialEndsAt, premiumUntil: row.premiumUntil, status: row.status };
  }

  @Post('subscription-pay')
  async pay(@Body() body: { tailorId: string; plan: 'monthly' | 'quarterly' | 'annual'; providerRef: string }) {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
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
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    return this.subscriptions.renewalReminders();
  }

  /** Dev-only: ask the provider about pending payments now. */
  @Post('subscription-reconcile')
  async reconcile() {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    return this.checkout.reconcilePending();
  }

  @Post('subscription-sync')
  async syncSubscriptions() {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    return { created: await this.subscriptions.ensureAll(), lapsed: await this.subscriptions.syncStatuses() };
  }

  @Get()
  async check(): Promise<HealthResponse> {
    const [dbUp, redisUp] = await Promise.all([
      this.db.isConfigured() ? this.db.ping() : Promise.resolve(false),
      this.queue.isConfigured() ? this.queue.ping() : Promise.resolve(false),
    ]);

    return {
      ok: true,
      version: process.env.npm_package_version ?? '0.0.0',
      // RENDER_GIT_COMMIT is injected by Render; the others cover Fly, Vercel
      // and a plain Docker build that passes it in.
      commit: (
        process.env.RENDER_GIT_COMMIT ??
        process.env.GIT_COMMIT_SHA ??
        process.env.SOURCE_COMMIT ??
        'unknown'
      ).slice(0, 7),
      uptime_s: Math.floor(process.uptime()),
      db: !this.db.isConfigured() ? 'not_configured' : dbUp ? 'up' : 'down',
      redis: !this.queue.isConfigured() ? 'disabled' : redisUp ? 'up' : 'down',
      sentry: sentryEnabled() ? 'enabled' : 'disabled',
    };
  }
}
