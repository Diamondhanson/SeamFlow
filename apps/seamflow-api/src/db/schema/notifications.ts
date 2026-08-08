import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * The notification inbox (migration 20260808210000).
 *
 * Keyed by `users.id`, not `tailors.id` — one inbox serves both apps, and the
 * row shouldn't care which role the person is wearing.
 *
 * `params` holds interpolation values, never rendered text: the apps render
 * `t('notifications.' + type, params)` at display time. Storing a rendered
 * string would freeze the language at write time and go stale when the entity
 * it describes is renamed.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    params: jsonb('params').notNull().default({}),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId, t.createdAt, t.id),
    unreadIdx: index('notifications_unread_idx')
      .on(t.userId)
      .where(sql`read_at is null`),
  }),
);

/**
 * Role-neutral per-user mutes.
 *
 * Separate from `notificationPreferences` (tailor-only reminder scheduling) —
 * lead days and reminder hours are meaningless to a client with no orders.
 *
 * `mutedTypes` is an opt-OUT list so a newly added notification type is live
 * for existing users without a backfill.
 */
export const notificationSettings = pgTable('notification_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  mutedTypes: text('muted_types').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
