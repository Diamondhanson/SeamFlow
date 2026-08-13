import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { QueueService } from '../queue/queue.service';
import { AccountPurgeService } from '../account/account-purge.service';
import { sentryEnabled } from '../common/sentry';
import { Public } from '../auth/decorators/public.decorator';

type HealthStatus = 'up' | 'down' | 'not_configured' | 'disabled';

interface HealthResponse {
  ok: true;
  version: string;
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

  @Get()
  async check(): Promise<HealthResponse> {
    const [dbUp, redisUp] = await Promise.all([
      this.db.isConfigured() ? this.db.ping() : Promise.resolve(false),
      this.queue.isConfigured() ? this.queue.ping() : Promise.resolve(false),
    ]);

    return {
      ok: true,
      version: process.env.npm_package_version ?? '0.0.0',
      uptime_s: Math.floor(process.uptime()),
      db: !this.db.isConfigured() ? 'not_configured' : dbUp ? 'up' : 'down',
      redis: !this.queue.isConfigured() ? 'disabled' : redisUp ? 'up' : 'down',
      sentry: sentryEnabled() ? 'enabled' : 'disabled',
    };
  }
}
