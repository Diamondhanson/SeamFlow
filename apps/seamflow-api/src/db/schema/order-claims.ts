import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users, tailors } from './users';
import { orders } from './orders';

// A consumer's claim on an order (see 20260715120000_order_claims.sql). Maps an
// auth user to an order they own so the client app can build a cross-tailor
// inbox + measurement locker.
export const orderClaims = pgTable(
  'order_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('order_claims_user_id_idx').on(t.userId),
    userOrderUnique: unique().on(t.userId, t.orderId),
  }),
);
