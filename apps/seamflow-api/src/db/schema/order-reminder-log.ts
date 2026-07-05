import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';

// De-dup ledger for order reminders. One row per (order, bucket); the unique
// constraint is what enforces "once per reminder point". Buckets look like
// 'lead_3', 'lead_0', 'overdue'. See migration 20260704130000.
export const orderReminderLog = pgTable(
  'order_reminder_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    bucket: text('bucket').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderBucketUniq: unique('order_reminder_log_order_bucket_uniq').on(
      t.orderId,
      t.bucket,
    ),
    orderIdx: index('order_reminder_log_order_idx').on(t.orderId),
  }),
);
