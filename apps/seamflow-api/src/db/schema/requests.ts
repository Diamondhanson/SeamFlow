// ============================================================================
// Requests & offers — "Can you make this?" (ROADMAP appendix H)
//
// A client posts a photo of a garment they want; tailors answer with offers;
// the client picks one and it becomes a conversation. The mirror of the
// discovery feed, and the direction that works without anyone having built a
// portfolio first.
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  char,
  integer,
  boolean,
  date,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';
import { users, tailors } from './users';
import { feedPosts } from './feed-posts';
import { conversations } from './chat';
import {
  requestVisibilityEnum,
  requestLocationScopeEnum,
  requestStatusEnum,
  offerStatusEnum,
} from './enums';

export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientUserId: uuid('client_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    description: text('description').notNull(),
    /** A key from the shared garment taxonomy. Text, not an enum: the
     *  vocabulary grows and old rows must keep loading. */
    garmentType: text('garment_type').notNull(),
    styleTags: jsonb('style_tags').notNull().default([]),
    /** Public-bucket derivatives, copied on post — the private upload never
     *  becomes publicly addressable. Same rule as the feed. */
    photos: jsonb('photos').notNull().default([]),
    budgetMin: numeric('budget_min', { precision: 12, scale: 2 }),
    budgetMax: numeric('budget_max', { precision: 12, scale: 2 }),
    currency: char('currency', { length: 3 }),
    deadline: date('deadline'),
    visibility: requestVisibilityEnum('visibility').notNull(),
    locationScope: requestLocationScopeEnum('location_scope'),
    locationValue: text('location_value'),
    status: requestStatusEnum('status').notNull().default('open'),
    acceptingOffers: boolean('accepting_offers').notNull().default(true),
    offersCount: integer('offers_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    openIdx: index('requests_open_idx').on(t.status, t.expiresAt),
    garmentIdx: index('requests_garment_type_idx').on(t.garmentType),
    locationIdx: index('requests_location_idx').on(t.locationScope, t.locationValue),
    clientIdx: index('requests_client_idx').on(t.clientUserId, t.createdAt),
  }),
);

/** The tailors a `selected` request was addressed to. Nobody else sees it. */
export const requestTargets = pgTable(
  'request_targets',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.requestId, t.tailorId] }),
    tailorIdx: index('request_targets_tailor_idx').on(t.tailorId),
  }),
);

/**
 * Who was NOTIFIED about a location request.
 *
 * Deliberately narrower than who may BROWSE it. Eligibility opens the board;
 * this records who was actively told, which is what a digest is built from and
 * what makes "why did I see this?" answerable.
 */
export const requestRecipients = pgTable(
  'request_recipients',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.requestId, t.tailorId] }),
    tailorIdx: index('request_recipients_tailor_idx').on(t.tailorId, t.notifiedAt),
  }),
);

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    /** Both null = "open to discuss". Forcing a price would make this a
     *  lowest-bid auction, which drives skilled tailors away. */
    price: numeric('price', { precision: 12, scale: 2 }),
    priceMax: numeric('price_max', { precision: 12, scale: 2 }),
    currency: char('currency', { length: 3 }),
    message: text('message').notNull(),
    samplePostId: uuid('sample_post_id').references(() => feedPosts.id, {
      onDelete: 'set null',
    }),
    status: offerStatusEnum('status').notNull().default('sent'),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** One offer per tailor per request — the most obvious spam vector. */
    onePerTailor: unique('offers_one_per_tailor').on(t.requestId, t.tailorId),
    requestIdx: index('offers_request_idx').on(t.requestId, t.createdAt),
    tailorIdx: index('offers_tailor_idx').on(t.tailorId, t.createdAt),
  }),
);
