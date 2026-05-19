import { Controller, Get } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { QueueService } from '../queue/queue.service';
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
      uptime_s: Math.floor(process.uptime()),
      db: !this.db.isConfigured() ? 'not_configured' : dbUp ? 'up' : 'down',
      redis: !this.queue.isConfigured() ? 'disabled' : redisUp ? 'up' : 'down',
      sentry: sentryEnabled() ? 'enabled' : 'disabled',
    };
  }
}
