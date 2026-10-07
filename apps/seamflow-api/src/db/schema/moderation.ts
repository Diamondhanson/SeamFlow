// ============================================================================
// Moderation tables. See supabase/migrations/20261008090000_moderation.sql for
// the reasoning behind the shapes — in particular why `target_id` is not a
// foreign key, and why a block is symmetric.
// ============================================================================

import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Null once the reporter closes their account; the report survives. */
    reporterUserId: uuid('reporter_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** 'design' | 'shop' | 'message' — see ReportTarget in @seamflow/schemas. */
    target: text('target').notNull(),
    /** Not a reference: a report must outlive the content it is about. */
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    status: text('status').notNull().default('open'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    targetIdx: index('content_reports_target_idx').on(t.target, t.targetId),
  }),
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerUserId: uuid('blocker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedUserId: uuid('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockerUserId, t.blockedUserId] }),
    blockedIdx: index('user_blocks_blocked_idx').on(t.blockedUserId),
  }),
);
