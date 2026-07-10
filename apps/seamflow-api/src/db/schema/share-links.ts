import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tailors } from './users';

// Short public share codes for order + invoice links. Replaces the long JWT in
// the URL: instead of `/o/<300-char-jwt>` the link is `/o/<9-char-code>`. The
// row holds what the token used to carry (target id, tailor id, expiry).
// `kind` is 'order' | 'invoice'; `target_id` is the order or invoice id.
export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    kind: text('kind').notNull(),
    targetId: uuid('target_id').notNull(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: index('share_links_code_idx').on(t.code),
    tailorIdx: index('share_links_tailor_idx').on(t.tailorId),
  }),
);
