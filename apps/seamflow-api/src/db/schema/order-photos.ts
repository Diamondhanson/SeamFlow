import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';

export const orderPhotos = pgTable(
  'order_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
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
    orderIdIdx: index('order_photos_order_id_idx').on(t.orderId),
  }),
);
