import { pgTable, uuid, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoToken: text('expo_token').notNull(),
    platform: text('platform').notNull(),
    /** Language the app was showing when it registered; null = never said (treated as English). */
    language: text('language'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTokenUniq: uniqueIndex('device_tokens_user_token_uniq').on(t.userId, t.expoToken),
    userIdx: index('device_tokens_user_idx').on(t.userId),
    languageCheck: check(
      'device_tokens_language_check',
      sql`${t.language} is null or ${t.language} in ('en', 'fr', 'pt', 'es', 'sw', 'ar')`,
    ),
    platformCheck: check(
      'device_tokens_platform_check',
      sql`${t.platform} in ('ios', 'android', 'web')`,
    ),
  }),
);
