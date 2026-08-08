import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { users, tailors } from './users';
import { orders } from './orders';
import { feedPosts } from './feed-posts';
import { conversationOriginEnum, messageSenderTypeEnum } from './enums';

/**
 * One thread between a consumer and a tailor (ROADMAP D.1.3).
 *
 * Unread counts and the last-message preview are denormalised so the
 * conversation list renders from a single query — a chat list that fans out to
 * count unread per row is the classic N+1 that makes messaging feel slow.
 *
 * Uniqueness (enforced by partial indexes in the migration): one thread per
 * (client, tailor, design), plus one general thread per (client, tailor) when
 * no design is attached. Re-inquiring about the same design reuses the thread.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientUserId: uuid('client_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    origin: conversationOriginEnum('origin').notNull().default('inquiry'),
    designPostId: uuid('design_post_id').references(() => feedPosts.id, {
      onDelete: 'set null',
    }),
    // Set once the thread turns into a commission (D.2.3 quote flow).
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessagePreview: text('last_message_preview'),
    clientUnread: integer('client_unread').notNull().default(0),
    tailorUnread: integer('tailor_unread').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdx: index('conversations_client_idx').on(t.clientUserId, t.lastMessageAt),
    tailorIdx: index('conversations_tailor_idx').on(t.tailorId, t.lastMessageAt),
  }),
);

/**
 * A single message (ROADMAP D.1.4).
 *
 * `clientId` is a caller-supplied idempotency key, and it is what makes the
 * offline send queue safe: a queued message that times out can be retried with
 * the same key, and the unique index turns the duplicate insert into a no-op
 * the API detects and reports as the original message. Without it, every flaky
 * network retry risks posting the same message twice.
 *
 * `attachments` holds image paths in the private `chat-media` bucket and/or
 * `{ designPostId }` references.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderType: messageSenderTypeEnum('sender_type').notNull(),
    senderUserId: uuid('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body'),
    attachments: jsonb('attachments').notNull().default([]),
    clientId: text('client_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    conversationCreatedIdx: index('messages_conversation_created_idx').on(
      t.conversationId,
      t.createdAt,
      t.id,
    ),
  }),
);
