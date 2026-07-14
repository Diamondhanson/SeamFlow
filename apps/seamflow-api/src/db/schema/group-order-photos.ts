import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { groupOrders } from './orders';
import { users } from './users';

// Shared reference/inspiration images for a whole group order. Mirrors
// order_photos but keyed to a group order (one pattern → many members).
export const groupOrderPhotos = pgTable(
  'group_order_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupOrderId: uuid('group_order_id')
      .notNull()
      .references(() => groupOrders.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    contentType: text('content_type'),
    role: text('role').notNull().default('reference'),
    caption: text('caption'),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupIdIdx: index('group_order_photos_group_id_idx').on(t.groupOrderId),
  }),
);
