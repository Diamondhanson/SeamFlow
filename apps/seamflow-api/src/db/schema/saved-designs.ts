// ============================================================================
// Saved designs. See supabase/migrations/20261010090000_saved_designs.sql for
// why this is private and why there is no public count.
// ============================================================================

import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { feedPosts } from './feed-posts';
import { users } from './users';

export const savedDesigns = pgTable(
  'saved_designs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feedPostId: uuid('feed_post_id')
      .notNull()
      .references(() => feedPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.feedPostId] }),
    userIdx: index('saved_designs_user_idx').on(t.userId, t.createdAt),
    postIdx: index('saved_designs_post_idx').on(t.feedPostId),
  }),
);
