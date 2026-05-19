import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Drizzle wrapper over postgres-js connected to Supabase's pgBouncer (transaction
 * mode, port 6543). `prepare: false` is required for transaction-mode pooling.
 *
 * The service-role connection bypasses RLS — only use it for webhooks, jobs,
 * and admin paths. RLS-respecting access goes through SupabaseService.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private client: ReturnType<typeof postgres> | null = null;
  private _db: Db | null = null;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      this.logger.warn('DATABASE_URL not set — DB queries will throw if used');
      return;
    }
    this.client = postgres(url, { prepare: false });
    this._db = drizzle(this.client, { schema });
    this.logger.log('Drizzle client connected (postgres-js, transaction pool)');
  }

  get db(): Db {
    if (!this._db) {
      throw new Error('DbService: DATABASE_URL is not configured');
    }
    return this._db;
  }

  isConfigured(): boolean {
    return this._db !== null;
  }

  /** Returns true if a `select 1` succeeds. Used by /health. */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client`select 1`;
      return true;
    } catch (err) {
      this.logger.error('DB ping failed', err as Error);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.end({ timeout: 5 });
    }
  }
}
