import { Controller, Get } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { QueueService } from '../queue/queue.service';
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
  ) {}

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
