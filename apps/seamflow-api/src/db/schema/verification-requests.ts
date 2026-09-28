import { pgTable, uuid, text, timestamp, index, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, tailors } from './users';
import { verificationStatusEnum } from './enums';

/**
 * A tailor asking SeamFlow to confirm their shop is real
 * (migration 20260928160000, appendix J).
 *
 * `evidence` is a discriminated array — `VerificationEvidence` in
 * @seamflow/schemas. Phase 1 collects one `work_photo`; the social handle,
 * foreground location fix and registration number join it in phase 3 without a
 * migration, because the staff queue renders whatever kinds it finds.
 *
 * History is kept in full: a tailor may be declined, fix the thing they were
 * told about, and submit again. Only one may be `pending` at a time, which the
 * partial unique index enforces rather than the service.
 */
export const verificationRequests = pgTable(
  'verification_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    status: verificationStatusEnum('status').notNull().default('pending'),
    evidence: jsonb('evidence').notNull().default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** The staff member. Kept if their account goes: the audit outlives them. */
    decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
    /** Required on a rejection, and shown to the tailor word for word. */
    decisionNote: text('decision_note'),
    /** Set once the retention job has removed the photos. */
    evidencePurgedAt: timestamp('evidence_purged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Partial unique: one in flight per tailor, every past decision kept.
    onePending: uniqueIndex('verification_requests_one_pending')
      .on(t.tailorId)
      .where(sql`status = 'pending'`),
    queueIdx: index('verification_requests_queue_idx').on(t.status, t.submittedAt),
    tailorIdx: index('verification_requests_tailor_idx').on(t.tailorId, t.submittedAt),
  }),
);
