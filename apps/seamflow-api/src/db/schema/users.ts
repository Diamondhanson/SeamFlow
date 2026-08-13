import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  char,
  unique,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    phone: text('phone'),
    email: text('email'),
    role: userRoleEnum('role').notNull().default('tailor'),
    fullName: text('full_name').notNull().default(''),
    /**
     * Set once the user completed an OTP challenge for `phone`.
     *
     * `phone` on its own is self-asserted — Supabase Auth records whatever was
     * supplied at signup. Gate anything that matters (delivery, payouts, the
     * verified badge) on this timestamp, never on `phone` being non-null.
     */
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),

    /**
     * Account deletion, with a 30-day grace period (App Store 5.1.1(v),
     * Google Play data deletion policy).
     *
     * `deletedAt` non-null means this row is a TOMBSTONE: the purge has run and
     * stripped every personal field, but the row itself stays so that the
     * foreign keys pointing here — a message in someone else's conversation, an
     * event on an order — remain valid. Treat such a row as "no longer a user".
     * Anything that counts, lists, notifies or displays users must filter on
     * `deletedAt is null`.
     */
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
    deletionScheduledFor: timestamp('deletion_scheduled_for', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roleIdx: index('users_role_idx').on(t.role),
    deletionDueIdx: index('users_deletion_due_idx').on(t.deletionScheduledFor),
  }),
);

export const tailors = pgTable(
  'tailors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessName: text('business_name').notNull(),
    photoUrl: text('photo_url'),
    location: text('location'),
    countryCode: char('country_code', { length: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    // ── Public storefront + trust signals (ROADMAP D.1.2) ──────────────────
    // Everything here is optional: existing tailors stay valid and the public
    // projection simply shows less until they fill it in. Never expose phone
    // or email through the public feed/storefront endpoints.
    bio: text('bio'),
    city: text('city'),
    specialties: jsonb('specialties').notNull().default([]),
    languages: jsonb('languages').notNull().default([]),
    avatarPath: text('avatar_path'),
    isVerified: boolean('is_verified').notNull().default(false),
    acceptsRemote: boolean('accepts_remote').notNull().default(false),
    followerCount: integer('follower_count').notNull().default(0),
    /** Median tailor reply latency, recomputed nightly. Null until enough data. */
    responseTimeHours: integer('response_time_hours'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdUnique: unique('tailors_user_id_key').on(t.userId),
  }),
);
