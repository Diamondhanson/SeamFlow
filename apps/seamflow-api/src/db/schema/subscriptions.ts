// ============================================================================
// Subscriptions (ROADMAP appendix I) — see the migration
// supabase/migrations/20260923120000_subscriptions.sql for the reasoning.
// ============================================================================

import {
  char,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tailors } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'grace',
  'free',
]);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['monthly', 'quarterly', 'annual']);
export const subscriptionMethodEnum = pgEnum('subscription_method', [
  'mtn_momo',
  'orange_money',
  'card',
]);
export const subscriptionPaymentStatusEnum = pgEnum('subscription_payment_status', [
  'pending',
  'succeeded',
  'failed',
]);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .unique()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }).notNull(),
    /** The one date every gate reads. Null until something has been paid. */
    premiumUntil: timestamp('premium_until', { withTimezone: true }),
    method: subscriptionMethodEnum('method'),
    plan: subscriptionPlanEnum('plan'),
    cardToken: text('card_token'),
    provider: text('provider'),
    graceUntil: timestamp('grace_until', { withTimezone: true }),
    lastPaymentAt: timestamp('last_payment_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trialIdx: index('subscriptions_trial_ends_idx').on(t.trialEndsAt),
    premiumIdx: index('subscriptions_premium_until_idx').on(t.premiumUntil),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  }),
);

export const subscriptionPayments = pgTable(
  'subscription_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('XAF'),
    method: subscriptionMethodEnum('method'),
    plan: subscriptionPlanEnum('plan'),
    daysAdded: integer('days_added').notNull().default(0),
    provider: text('provider'),
    /** The provider's id — unique per provider, so a repeated webhook is a no-op. */
    providerRef: text('provider_ref'),
    status: subscriptionPaymentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdx: index('subscription_payments_tailor_idx').on(t.tailorId, t.createdAt),
  }),
);
