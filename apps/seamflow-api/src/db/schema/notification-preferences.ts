import {
  pgTable,
  uuid,
  boolean,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { tailors } from './users';

// One row per tailor. Controls order-due reminders + the status-change push.
// See migration 20260704120000 and docs/notifications-reminders-plan.md.
export const notificationPreferences = pgTable('notification_preferences', {
  tailorId: uuid('tailor_id')
    .primaryKey()
    .references(() => tailors.id, { onDelete: 'cascade' }),
  dueRemindersEnabled: boolean('due_reminders_enabled').notNull().default(true),
  // Days-before-due reminder points; default single point [3].
  leadDays: integer('lead_days').array().notNull().default([3]),
  overdueEnabled: boolean('overdue_enabled').notNull().default(true),
  statusChangeEnabled: boolean('status_change_enabled').notNull().default(true),
  reminderHour: integer('reminder_hour').notNull().default(8),
  timezone: text('timezone'),
  language: text('language').notNull().default('en'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
