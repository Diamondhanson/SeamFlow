import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  char,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { tailors } from './users';
import { orders } from './orders';
import { invoiceStatusEnum } from './enums';

// One invoice per order. `lineItems` is a jsonb array of
// { id, category, description, quantity, unitPrice }; `total` is the
// denormalised subtotal recomputed by the service on every write.
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    currency: char('currency', { length: 3 }),
    lineItems: jsonb('line_items').notNull().default([]),
    deposit: numeric('deposit', { precision: 12, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('invoices_tailor_id_idx').on(t.tailorId),
    orderIdIdx: index('invoices_order_id_idx').on(t.orderId),
    statusIdx: index('invoices_status_idx').on(t.status),
    orderUnique: unique('invoices_order_id_key').on(t.orderId),
  }),
);
