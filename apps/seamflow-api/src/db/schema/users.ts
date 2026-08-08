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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roleIdx: index('users_role_idx').on(t.role),
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
