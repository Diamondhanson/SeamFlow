// ============================================================================
// Chat photo retention (plan step 4).
//
// Chat photos are most of what chat costs to store. Once a job is long done,
// the full-size original has served its purpose, but the conversation is
// still a business record — so the rule is narrow:
//
//   · only photos in a conversation linked to an order
//   · only once that order has been DELIVERED for more than 90 days
//   · never while that order has an unresolved support ticket — the photo may
//     be the evidence someone is about to need
//   · the PREVIEW is kept forever; the message is rewritten to point at it,
//     so the photo still shows in the thread, just smaller
//
// Conversations with no order (enquiries that went nowhere) are untouched:
// "90 days after the order is finished" has no starting point for them.
//
// Rewriting the message bumps messages.updated_at (trigger), so devices that
// hold a copy pick up the new path on their next sync.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, sql } from 'drizzle-orm';
import type { MessageAttachment } from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { messages } from '../db/schema';

export const RETENTION_DAYS = 90;
const CHAT_BUCKET = 'chat-media';
/** Per run; the cron comes back tomorrow for the rest. */
const BATCH = 500;

@Injectable()
export class ChatMediaRetentionService {
  private readonly logger = new Logger(ChatMediaRetentionService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  @Cron('50 3 * * *')
  async nightly(): Promise<void> {
    if (!this.dbService.isConfigured()) return;
    try {
      const n = await this.run();
      if (n) this.logger.log(`Removed ${n} full-size chat photo(s) past retention`);
    } catch (err) {
      this.logger.error(`Chat photo retention failed: ${(err as Error).message}`);
    }
  }

  /** Returns how many full-size files were removed. Exposed for the test hook. */
  async run(): Promise<number> {
    const db = this.dbService.db;
    // Delivered-at is the latest move INTO delivered; an order reopened since
    // is no longer delivered and is excluded by the status check.
    const due = (await db.execute(sql`
      select m.id, m.attachments
      from messages m
      join conversations c on c.id = m.conversation_id
      join orders o on o.id = c.order_id
      where o.status = 'delivered'
        and coalesce(
              (select max(e.created_at) from order_events e
                where e.order_id = o.id and e.to_status = 'delivered'),
              o.updated_at
            ) < now() - make_interval(days => ${RETENTION_DAYS})
        and not exists (
              select 1 from support_tickets t
              where t.order_id = o.id and t.status <> 'resolved')
        and exists (
              select 1 from jsonb_array_elements(m.attachments) a
              where a->>'kind' = 'image'
                and a->>'fullSizeRemovedAt' is null
                and a->>'thumbnailPath' is not null
                and a->>'thumbnailPath' <> a->>'storagePath')
      limit ${BATCH}
    `)) as unknown as { id: string; attachments: MessageAttachment[] }[];

    let removed = 0;
    for (const row of due) {
      const paths: string[] = [];
      const now = new Date().toISOString();
      const next = row.attachments.map((a) => {
        if (
          a.kind !== 'image' ||
          a.fullSizeRemovedAt ||
          !a.thumbnailPath ||
          a.thumbnailPath === a.storagePath
        ) {
          return a;
        }
        paths.push(a.storagePath);
        return { ...a, storagePath: a.thumbnailPath, fullSizeRemovedAt: now };
      });
      if (!paths.length) continue;

      // Storage first: if it fails, the message still points at a file that
      // exists, and tomorrow's run retries. The reverse order could leave a
      // message pointing at the preview while the original lingers unseen.
      const { error } = await this.supabase.admin().storage.from(CHAT_BUCKET).remove(paths);
      if (error) {
        this.logger.warn(`Could not remove ${paths.length} chat photo(s): ${error.message}`);
        continue;
      }
      await db.update(messages).set({ attachments: next }).where(eq(messages.id, row.id));
      removed += paths.length;
    }
    return removed;
  }
}
