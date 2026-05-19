import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';

/**
 * BullMQ + ioredis. Optional at boot — if REDIS_URL is missing the service
 * stays in disabled mode and `getQueue()` returns null.
 *
 * Upstash requires TLS, so REDIS_URL should be the rediss:// form.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: Redis | null = null;
  private readonly queues = new Map<string, Queue>();

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — BullMQ queues disabled');
      return;
    }
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    this.connection.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
    this.logger.log('ioredis connection ready');
  }

  isConfigured(): boolean {
    return this.connection !== null;
  }

  getQueue(name: string): Queue | null {
    if (!this.connection) return null;
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async ping(): Promise<boolean> {
    if (!this.connection) return false;
    try {
      const res = await this.connection.ping();
      return res === 'PONG';
    } catch (err) {
      this.logger.error('Redis ping failed', err as Error);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) {
      await q.close();
    }
    if (this.connection) {
      await this.connection.quit();
    }
  }
}
