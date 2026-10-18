import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Anything that can run a query — the pooled handle, or a transaction handle
 * from `db.transaction()`.
 *
 * Structural on purpose: both satisfy it, so a service method can take one and
 * be called either standalone or inside a caller's transaction. That is what
 * lets "mark the payment paid" and "grant the subscription" commit together.
 */
export type Executor = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>;

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
    this.client = postgres(url, {
      // Required by transaction-mode pooling: pgBouncer hands a different
      // server connection to each transaction, so a prepared statement made on
      // one is not there on the next.
      prepare: false,
      // Bound the pool explicitly rather than inheriting a default. Supabase's
      // pooler has a ceiling of its own, and this number is PER INSTANCE — if
      // the API is ever scaled out, divide it rather than multiplying the load
      // on the pooler.
      max: 10,
      // Let an idle connection go. With a pooler in front there is nothing to
      // gain from holding one open, and on the free tier the process is
      // suspended between requests anyway.
      idle_timeout: 30,
      // Fail fast instead of hanging. Without this a stalled pooler turns every
      // request into a request that never answers — the worst failure mode,
      // because nothing upstream can tell it from slowness. 10 seconds is long
      // for a transatlantic connect and short enough to surface as an error.
      connect_timeout: 10,
    });
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
