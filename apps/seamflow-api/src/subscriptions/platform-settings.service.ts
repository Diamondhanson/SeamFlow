// ============================================================================
// Platform switches, read constantly and changed rarely.
//
// The enforcement switch is checked on every gated request, so it is cached
// for a few seconds rather than queried each time. The cache is short on
// purpose: when someone turns the caps ON from the dashboard, the platform
// should follow within seconds, not after a deploy or a restart.
//
// Writes go through the ops dashboard (staff only) and record who flipped it.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { platformSettings } from '../db/schema';

export const ENFORCEMENT_KEY = 'subscription_enforcement';
const CACHE_MS = 15_000;

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);
  private cache = new Map<string, { value: unknown; at: number }>();

  constructor(
    private readonly dbService: DbService,
    private readonly config: ConfigService,
  ) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    try {
      const rows = await this.dbService.db
        .select({ value: platformSettings.value })
        .from(platformSettings)
        .where(eq(platformSettings.key, key))
        .limit(1);
      const value = (rows[0]?.value ?? fallback) as T;
      this.cache.set(key, { value, at: Date.now() });
      return value;
    } catch (err) {
      // A settings read must never take a request down. Falling back to the
      // safe default (gates OFF) is the right failure: a database blip should
      // not start blocking tailors.
      this.logger.warn(`Could not read setting ${key}: ${(err as Error).message}`);
      return fallback;
    }
  }

  async set(key: string, value: unknown, updatedBy: string | null): Promise<void> {
    await this.dbService.db
      .insert(platformSettings)
      .values({ key, value, updatedBy, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedBy, updatedAt: new Date() },
      });
    this.cache.delete(key);
    this.logger.log(`Setting ${key} = ${JSON.stringify(value)} (by ${updatedBy ?? 'system'})`);
  }

  /**
   * Are the Free caps and premium gates live?
   *
   * The dashboard switch is the source of truth. SUBSCRIPTION_ENFORCEMENT in
   * the environment stays as an override for a server that must have them on
   * regardless — it can force them ON, never off, so a misread setting cannot
   * silently disable a live paywall.
   */
  async enforcementOn(): Promise<boolean> {
    if (this.config.get<boolean>('SUBSCRIPTION_ENFORCEMENT') === true) return true;
    return this.get<boolean>(ENFORCEMENT_KEY, false);
  }
}
