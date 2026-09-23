import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { QueueService } from '../queue/queue.service';
import { AccountPurgeService } from '../account/account-purge.service';
import { ChatMediaRetentionService } from '../chat/chat-media-retention.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { sentryEnabled } from '../common/sentry';
import { Public } from '../auth/decorators/public.decorator';

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

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DbService,
    private readonly queue: QueueService,
    private readonly purge: AccountPurgeService,
    private readonly retention: ChatMediaRetentionService,
    private readonly subscriptions: SubscriptionsService,
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
