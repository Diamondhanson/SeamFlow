import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  numeric,
  char,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders';
import { paymentProviderEnum, paymentStatusEnum } from './enums';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    provider: paymentProviderEnum('provider').notNull(),
    providerPaymentId: text('provider_payment_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdIdx: index('payments_order_id_idx').on(t.orderId),
    statusIdx: index('payments_status_idx').on(t.status),
    providerPaymentIdIdx: index('payments_provider_payment_id_idx').on(t.providerPaymentId),
    amountCheck: check('payments_amount_check', sql`${t.amount} > 0`),
  }),
);
