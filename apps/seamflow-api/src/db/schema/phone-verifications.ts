import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { otpChannelEnum } from './enums';

/**
 * An OTP challenge for phone verification (migration 20260808200000).
 *
 * `phone` is stored per attempt rather than read from `users.phone` so that
 * changing a number is verify-then-commit: the new number only lands on the
 * user record once a challenge against it succeeds. That way a typo'd or
 * hostile number can never displace a working, verified one.
 *
 * `codeHash` is an HMAC of the code — the plaintext exists only in the message
 * we send and in the request the user makes back.
 */
export const phoneVerifications = pgTable(
  'phone_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    channel: otpChannelEnum('channel').notNull().default('whatsapp'),
    /** Which adapter sent it (e.g. 'console', 'meta-cloud'). Null until sent. */
    providerId: text('provider_id'),
    providerMessageId: text('provider_message_id'),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('phone_verifications_user_idx').on(t.userId, t.createdAt),
    phoneCreatedIdx: index('phone_verifications_phone_created_idx').on(
      t.phone,
      t.createdAt,
    ),
    // Partial unique: at most one live challenge per user. Mirrors the
    // migration — Drizzle needs the `where` or it would try to enforce one row
    // per user for all time.
    oneLivePerUser: uniqueIndex('phone_verifications_one_live_per_user')
      .on(t.userId)
      .where(sql`consumed_at is null`),
  }),
);
