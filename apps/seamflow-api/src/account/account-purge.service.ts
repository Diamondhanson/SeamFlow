// ============================================================================
// The purge. Everything here is irreversible, so it is written to be dull.
//
// ORDER MATTERS, and it is the opposite of the obvious one:
//
//   1. storage   — objects live outside the database and no cascade reaches
//                  them. If we deleted rows first we would lose the ids we
//                  need to find the files, and the photographs would outlive
//                  the account that owned them.
//   2. rows      — deleting the tailor cascades the whole business record.
//   3. tombstone — strip the users row of everything personal but KEEP it, so
//                  the foreign keys pointing at it stay valid.
//   4. auth user — last, always. Delete this first and a failure anywhere
//                  above leaves data with an owner who can no longer sign in
//                  to ask again. Last means every earlier step is retryable.
//
// A failure at any step leaves the account pending and logs loudly; the next
// night's run tries again. Half-deleting quietly is the one outcome worth
// engineering against.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { conversations, messages, tailors, users } from '../db/schema';

/**
 * Buckets whose top-level folder is the TAILOR id.
 * Confirmed against live object paths, e.g. `avatars/<tailorId>/<file>.webp`.
 */
const TAILOR_PREFIXED_BUCKETS = ['avatars', 'designs', 'order-photos', 'works', 'feed'];

/** Buckets whose top-level folder is the USER id. */
const USER_PREFIXED_BUCKETS = ['requests'];

/**
 * chat-media is keyed by CONVERSATION id, not by owner — so a user's images
 * cannot be found by prefix without first asking which conversations they were
 * part of. Missing this is how photos survive a deletion.
 */
const CHAT_BUCKET = 'chat-media';

@Injectable()
export class AccountPurgeService {
  private readonly logger = new Logger(AccountPurgeService.name);

  constructor(
    private readonly db: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Nightly. Deliberately off the hour — the API shares a free instance and
   * every other scheduled job in this codebase already crowds :00.
   */
  @Cron('20 3 * * *')
  async purgeDue(): Promise<void> {
    if (!this.db.isConfigured()) return;

    const due = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNotNull(users.deletionScheduledFor),
          isNull(users.deletedAt),
          lte(users.deletionScheduledFor, new Date()),
        ),
      );

    if (!due.length) return;
    this.logger.log(`Purging ${due.length} account(s) past their grace period`);

    for (const { id } of due) {
      try {
        await this.purgeUser(id);
        this.logger.log(`Purged ${id}`);
      } catch (err) {
        // Left pending on purpose: tomorrow's run retries. Better a late
        // deletion we can see in the logs than a half-finished one we cannot.
        this.logger.error(`Purge FAILED for ${id}, will retry: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Purge one account. Exposed so it can be driven by a script or an admin
   * action, and so it can be tested without waiting 30 days.
   */
  async purgeUser(userId: string): Promise<void> {
    const db = this.db.db;

    const [tailor] = await db.select().from(tailors).where(eq(tailors.userId, userId)).limit(1);

    // 1 — storage, before the ids that locate it are gone.
    await this.purgeStorage(userId, tailor?.id ?? null);

    // 2 — the business record. One delete; the schema's cascades do the rest
    // (clients, orders, invoices, templates, fabrics, designs, works, feed
    // posts, share links, offers, conversations for this shop).
    if (tailor) await db.delete(tailors).where(eq(tailors.id, tailor.id));

    // 3 — their words in conversations that outlive them. The rows stay so the
    // other party's thread still reads in order; the content does not.
    await db
      .update(messages)
      .set({ body: '', attachments: [] })
      .where(eq(messages.senderUserId, userId));

    // 4 — tombstone. Every personal field cleared, the key kept.
    await db
      .update(users)
      .set({
        email: null,
        phone: null,
        fullName: '',
        phoneVerifiedAt: null,
        deletedAt: new Date(),
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 5 — credentials last.
    const { error } = await this.supabase.admin().auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`auth user not deleted: ${error.message}`);
    }
  }

  // -------------------------------------------------------------------------

  private async purgeStorage(userId: string, tailorId: string | null): Promise<void> {
    if (tailorId) {
      for (const bucket of TAILOR_PREFIXED_BUCKETS) {
        await this.removeFolder(bucket, tailorId);
      }
    }
    for (const bucket of USER_PREFIXED_BUCKETS) {
      await this.removeFolder(bucket, userId);
    }

    // chat-media: find the threads first, then clear each one's folder.
    const threads = await this.db.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        tailorId
          ? or(eq(conversations.clientUserId, userId), eq(conversations.tailorId, tailorId))
          : eq(conversations.clientUserId, userId),
      );
    for (const t of threads) {
      await this.removeFolder(CHAT_BUCKET, t.id);
    }
  }

  /**
   * Delete every object under `prefix/`, including one level of nesting —
   * order-photos stores `<tailorId>/<orderId>/<file>` and designs stores
   * `<tailorId>/templates/<file>`, so a flat listing would miss most of it.
   */
  private async removeFolder(bucket: string, prefix: string): Promise<void> {
    const storage = this.supabase.admin().storage.from(bucket);

    const collect = async (path: string, depth: number): Promise<string[]> => {
      const { data, error } = await storage.list(path, { limit: 1000 });
      if (error || !data) return [];
      const files: string[] = [];
      for (const entry of data) {
        const full = `${path}/${entry.name}`;
        // Supabase reports folders as entries with no id.
        if (entry.id === null && depth > 0) {
          files.push(...(await collect(full, depth - 1)));
        } else if (entry.id !== null) {
          files.push(full);
        }
      }
      return files;
    };

    try {
      const paths = await collect(prefix, 2);
      if (!paths.length) return;
      // Chunked: `remove` takes a bounded list and a shop with a long history
      // can hold more objects than one call will accept.
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await storage.remove(paths.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
      this.logger.log(`Removed ${paths.length} object(s) from ${bucket}/${prefix}`);
    } catch (err) {
      // Rethrow: an account is not deleted while its photographs remain, and
      // leaving it pending means tomorrow tries again.
      throw new Error(`storage ${bucket}/${prefix}: ${(err as Error).message}`);
    }
  }

  /** Accounts whose purge is overdue — used by the admin dashboard. */
  async listPending(): Promise<{ id: string; scheduledFor: Date | null }[]> {
    return this.db.db
      .select({ id: users.id, scheduledFor: users.deletionScheduledFor })
      .from(users)
      .where(and(isNotNull(users.deletionScheduledFor), isNull(users.deletedAt)));
  }

  /** Tombstoned ids, so callers can exclude them without knowing the rule. */
  async tombstonedIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, ids), isNotNull(users.deletedAt)));
    return new Set(rows.map((r) => r.id));
  }
}
