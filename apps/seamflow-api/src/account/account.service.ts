// ============================================================================
// Asking to be deleted, changing your mind, and taking your data with you.
//
// The purge itself lives in account-purge.service.ts. This file only ever
// moves an account between three states:
//
//   live      → deletion_requested_at is null
//   pending   → requested, scheduled 30 days out, still recoverable
//   tombstone → the purge ran (deleted_at set); nothing here can undo that
//
// Everything destructive is deliberately deferred. What happens IMMEDIATELY on
// request is only what is reversible: they disappear from the public feed,
// their devices stop being notified, their sessions are dropped. If they come
// back within the month, all of that comes back with them.
// ============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DELETION_GRACE_DAYS,
  REAUTH_MAX_AGE_SECONDS,
  type AccountExport,
  type DeletionState,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  clients,
  designs,
  deviceTokens,
  fabrics,
  invoices,
  measurementTemplates,
  orders,
  requests,
  tailors,
  users,
} from '../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly db: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Reject a deletion request unless the caller proved who they are just now.
   *
   * The token's `iat` is when Supabase minted it. A token minted at sign-in
   * hours ago fails this; one minted by a fresh password re-entry passes. That
   * is the whole point — an unlocked phone someone walked away from should not
   * be able to close a business, and a confirmation dialog is not proof of
   * identity, only proof that a finger touched the screen.
   */
  assertFreshAuth(jwt: string): void {
    const iat = decodeIssuedAt(jwt);
    if (iat === null) {
      throw new BadRequestException('Could not verify how recently you signed in.');
    }
    const ageSeconds = Math.floor(Date.now() / 1000) - iat;
    if (ageSeconds > REAUTH_MAX_AGE_SECONDS) {
      throw new ForbiddenException('Please confirm your password again to continue.');
    }
  }

  async getState(userId: string): Promise<DeletionState> {
    const db = this.db.db;
    const rows = await db
      .select({
        requestedAt: users.deletionRequestedAt,
        scheduledFor: users.deletionScheduledFor,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row?.requestedAt || !row.scheduledFor) {
      return { requestedAt: null, scheduledFor: null, daysRemaining: null };
    }
    return {
      requestedAt: row.requestedAt.toISOString(),
      scheduledFor: row.scheduledFor.toISOString(),
      daysRemaining: daysUntil(row.scheduledFor),
    };
  }

  /**
   * Start the clock. Idempotent: asking twice does not shorten the grace
   * period, because a second tap is far more likely to be impatience than a
   * considered decision to be deleted sooner.
   */
  async requestDeletion(userId: string, reason?: string): Promise<DeletionState> {
    const db = this.db.db;

    const existing = await this.getState(userId);
    if (existing.requestedAt) return existing;

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * DAY_MS);

    await db
      .update(users)
      .set({
        deletionRequestedAt: now,
        deletionScheduledFor: scheduledFor,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    // Reversible consequences only — see the header. Disappearing from the
    // public feed needs no work here at all: every public query tests the
    // owner's state (see common/live-owner.ts), so setting the timestamp above
    // has already done it, and clearing it will undo it. Nothing of theirs is
    // touched, which is what makes the grace period honest.
    await this.silenceDevices(userId);
    await this.dropSessions(userId);

    if (reason) this.logger.log(`Deletion requested by ${userId}: ${reason.slice(0, 200)}`);
    else this.logger.log(`Deletion requested by ${userId}`);

    return this.getState(userId);
  }

  /** Change of mind. Only possible while the row is still pending. */
  async cancelDeletion(userId: string): Promise<DeletionState> {
    const db = this.db.db;
    await db
      .update(users)
      .set({
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    // No un-hiding to do: clearing the timestamp above already makes every
    // public query see them again, exactly as they left it.
    this.logger.log(`Deletion cancelled by ${userId}`);
    return this.getState(userId);
  }

  /**
   * Take everything with you.
   *
   * Deliberately raw rows rather than a prettied report: the point is
   * completeness, not presentation, and a tailor who needs this is usually
   * feeding it to an accountant or another tool.
   */
  async exportAccount(userId: string): Promise<AccountExport> {
    const db = this.db.db;

    const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [tailor] = await db.select().from(tailors).where(eq(tailors.userId, userId)).limit(1);

    const empty = {
      exportedAt: new Date().toISOString(),
      account: (account ?? {}) as Record<string, unknown>,
      tailor: null,
      clients: [],
      orders: [],
      invoices: [],
      measurementTemplates: [],
      fabrics: [],
      designs: [],
      requests: [] as Record<string, unknown>[],
    };

    const myRequests = (await db
      .select()
      .from(requests)
      .where(eq(requests.clientUserId, userId))) as Record<string, unknown>[];

    if (!tailor) return { ...empty, requests: myRequests };

    const tid = tailor.id;
    const [cl, or, inv, tpl, fab, des] = await Promise.all([
      db.select().from(clients).where(eq(clients.tailorId, tid)),
      db.select().from(orders).where(eq(orders.tailorId, tid)),
      db.select().from(invoices).where(eq(invoices.tailorId, tid)),
      db.select().from(measurementTemplates).where(eq(measurementTemplates.tailorId, tid)),
      db.select().from(fabrics).where(eq(fabrics.tailorId, tid)),
      db.select().from(designs).where(eq(designs.tailorId, tid)),
    ]);

    return {
      exportedAt: empty.exportedAt,
      account: empty.account,
      tailor: tailor as unknown as Record<string, unknown>,
      clients: cl as Record<string, unknown>[],
      orders: or as Record<string, unknown>[],
      invoices: inv as Record<string, unknown>[],
      measurementTemplates: tpl as Record<string, unknown>[],
      fabrics: fab as Record<string, unknown>[],
      designs: des as Record<string, unknown>[],
      requests: myRequests,
    };
  }

  // ---- reversible immediate effects ---------------------------------------

  private async silenceDevices(userId: string): Promise<void> {
    try {
      await this.db.db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
    } catch (err) {
      this.logger.warn(`Could not clear device tokens for ${userId}: ${(err as Error).message}`);
    }
  }

  /** Sign them out everywhere. They can sign back in to cancel. */
  private async dropSessions(userId: string): Promise<void> {
    try {
      await this.supabase.admin().auth.admin.signOut(userId, 'global');
    } catch (err) {
      this.logger.warn(`Could not drop sessions for ${userId}: ${(err as Error).message}`);
    }
  }
}

/** `iat` out of a JWT payload, without verifying it — the guard already did. */
function decodeIssuedAt(jwt: string): number | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    const iat = (JSON.parse(json) as { iat?: unknown }).iat;
    return typeof iat === 'number' ? iat : null;
  } catch {
    return null;
  }
}

function daysUntil(when: Date): number {
  return Math.max(0, Math.ceil((when.getTime() - Date.now()) / DAY_MS));
}
