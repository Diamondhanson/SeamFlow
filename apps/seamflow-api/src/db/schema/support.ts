// ============================================================================
// Help & Support tickets — see packages/schemas/src/support.ts for the why,
// and supabase/migrations/20260921180000_support_tickets.sql for the DDL.
// ============================================================================

import { integer, index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { orders } from './orders';

export const supportCategoryEnum = pgEnum('support_category', [
  'app_problem',
  'payment',
  'account',
  'order',
  'other',
]);
export const supportStatusEnum = pgEnum('support_status', ['open', 'waiting_on_user', 'resolved']);
export const supportSideEnum = pgEnum('support_side', ['tailor', 'client']);
export const supportSenderEnum = pgEnum('support_sender', ['user', 'support']);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** From a sequence starting at 1000; shown as "SF-1042". */
    number: integer('number')
      .notNull()
      .unique()
      .default(sql`nextval('public.support_ticket_number_seq')`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    side: supportSideEnum('side').notNull(),
    category: supportCategoryEnum('category').notNull(),
    status: supportStatusEnum('status').notNull().default('open'),
    subject: text('subject').notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    clientId: text('client_id').notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    lastMessagePreview: text('last_message_preview'),
    userUnread: integer('user_unread').notNull().default(0),
    supportUnread: integer('support_unread').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('support_tickets_user_idx').on(t.userId, t.lastMessageAt),
    statusIdx: index('support_tickets_status_idx').on(t.status, t.lastMessageAt),
    userClientUnique: unique('support_tickets_user_id_client_id_key').on(t.userId, t.clientId),
  }),
);

export const supportMessages = pgTable(
  'support_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    sender: supportSenderEnum('sender').notNull(),
    senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull().default(''),
    attachments: jsonb('attachments').notNull().default([]),
    clientId: text('client_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index('support_messages_ticket_idx').on(t.ticketId, t.createdAt),
    ticketClientUnique: unique('support_messages_ticket_id_client_id_key').on(t.ticketId, t.clientId),
  }),
);
