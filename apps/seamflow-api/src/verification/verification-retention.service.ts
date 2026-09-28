// ============================================================================
// Verification evidence retention (appendix J.4).
//
// The rule, stated in the app's own copy to every tailor who submits:
//
//   "Only SeamFlow staff see these photos, and we delete them 90 days after we
//    decide."
//
// That sentence is a promise, and a promise with no cron behind it is a lie
// that takes 90 days to become visible. This is the cron.
//
// WHAT IS KEPT, AND WHAT GOES
//
//   the decision       forever — who verified whom, and on what evidence
//   the evidence KINDS forever — already in admin_actions at decision time
//   the photos         90 days after the decision
//
// Keeping the record while dropping the pictures is the whole point. We can
// still answer "why does this shop have a badge"; we are not still holding
// photographs of a stranger's workshop and their hands two years later.
//
// A PENDING REQUEST IS NEVER TOUCHED. Its clock has not started: `decided_at`
// is null, and a request nobody has looked at yet still needs its evidence.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { VerificationEvidence } from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { verificationRequests } from '../db/schema';

export const EVIDENCE_RETENTION_DAYS = 90;
const EVIDENCE_BUCKET = 'verification-evidence';
/** Per run; the cron comes back tomorrow for the rest. */
const BATCH = 200;

@Injectable()
export class VerificationRetentionService {
  private readonly logger = new Logger(VerificationRetentionService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  // Twenty past four, so it is not competing with the chat photo sweep at 3:50.
  @Cron('20 4 * * *')
  async nightly(): Promise<void> {
    if (!this.dbService.isConfigured()) return;
    try {
      const n = await this.run();
      if (n) this.logger.log(`Removed evidence from ${n} decided verification request(s)`);
    } catch (err) {
      this.logger.error(`Verification retention failed: ${(err as Error).message}`);
    }
  }

  /** Returns how many requests were cleared. Exposed for the test hook. */
  async run(): Promise<number> {
    const db = this.dbService.db;

    const due = await db
      .select({ id: verificationRequests.id, evidence: verificationRequests.evidence })
      .from(verificationRequests)
      .where(
        and(
          // Decided, and long enough ago. A withdrawn request has no
          // decided_at either, so it is swept by its submission date instead —
          // see below.
          isNotNull(verificationRequests.decidedAt),
          lt(
            verificationRequests.decidedAt,
            sql`now() - make_interval(days => ${EVIDENCE_RETENTION_DAYS})`,
          ),
          isNull(verificationRequests.evidencePurgedAt),
        ),
      )
      .limit(BATCH);

    // A withdrawn request was never decided, so it has no decided_at to count
    // from — but its photos should not live forever either. The clock runs from
    // when it was submitted, which is the only date it has.
    const withdrawn = await db
      .select({ id: verificationRequests.id, evidence: verificationRequests.evidence })
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.status, 'withdrawn'),
          lt(
            verificationRequests.submittedAt,
            sql`now() - make_interval(days => ${EVIDENCE_RETENTION_DAYS})`,
          ),
          isNull(verificationRequests.evidencePurgedAt),
        ),
      )
      .limit(BATCH);

    let cleared = 0;
    for (const row of [...due, ...withdrawn]) {
      const paths = ((row.evidence ?? []) as VerificationEvidence[])
        .filter((e) => e.kind === 'work_photo')
        .map((e) => e.storagePath);

      if (paths.length) {
        // Storage first. If the delete fails we leave the row alone and try
        // again tomorrow; marking it purged while the files survive would mean
        // the dashboard says "deleted" about photos we are still holding, which
        // is the one outcome worse than being late.
        const { error } = await this.supabase
          .admin()
          .storage.from(EVIDENCE_BUCKET)
          .remove(paths);
        if (error) {
          this.logger.warn(
            `Could not remove ${paths.length} evidence photo(s) for ${row.id}: ${error.message}`,
          );
          continue;
        }
      }

      // The evidence array is emptied as well as timestamped: a storage path
      // for a file that no longer exists is just a way to generate broken
      // links and confusing 404s in the queue.
      await db
        .update(verificationRequests)
        .set({ evidence: [], evidencePurgedAt: new Date() })
        .where(eq(verificationRequests.id, row.id));
      cleared += 1;
    }
    return cleared;
  }
}
