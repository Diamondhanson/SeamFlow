import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Two clients live side by side:
 *   - `anon()` returns a client keyed with the public anon key. Pair it with
 *     a user JWT (via `withUserToken()`) for RLS-respecting requests.
 *   - `admin()` returns a client keyed with the service_role key. Bypasses
 *     RLS — only use for webhooks, jobs, and admin paths.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly anonClient: SupabaseClient;
  private readonly adminClient: SupabaseClient;
  private readonly url: string;
  private readonly anonKey: string;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL');
    this.anonKey = config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceKey = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.anonClient = createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.adminClient = createClient(this.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.logger.log(`Supabase clients ready (project: ${new URL(this.url).hostname})`);
  }

  anon(): SupabaseClient {
    return this.anonClient;
  }

  admin(): SupabaseClient {
    return this.adminClient;
  }

  /** Returns a fresh anon-keyed client scoped to a specific user JWT. */
  withUserToken(jwt: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  }
}
