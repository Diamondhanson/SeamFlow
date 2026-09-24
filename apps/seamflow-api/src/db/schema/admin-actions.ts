import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Append-only record of what staff did from the ops dashboard.
 *
 * Written by AdminAuditService and read by the dashboard; nothing in either
 * app touches it. The actor is always a real person's user id, so "who did
 * this" has an answer that is not "an admin".
 */
export const adminActions = pgTable(
  'admin_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** A short verb: 'tailor.verify', 'user.sign_out', 'post.takedown'. */
    action: text('action').notNull(),
    /** 'tailor' | 'user' | 'feed_post' | 'platform'. */
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    /** Whatever makes the action legible later: old and new value, a reason. */
    detail: jsonb('detail').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    targetIdx: index('admin_actions_target_idx').on(t.targetType, t.targetId, t.createdAt),
    actorIdx: index('admin_actions_actor_idx').on(t.actorUserId, t.createdAt),
    recentIdx: index('admin_actions_recent_idx').on(t.createdAt),
  }),
);
