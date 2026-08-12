import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';
import { designs } from './designs';
import { tailorWorks } from './tailor-works';

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
    // Where this photo came from, when it was attached from Design Studio or
    // My Designs. PROVENANCE ONLY — the photo owns its own object in this
    // bucket and renders from that, so deleting the original design nulls the
    // pointer and breaks nothing. An order is a record that has to stay true.
    sourceDesignId: uuid('source_design_id').references(() => designs.id, {
      onDelete: 'set null',
    }),
    // `(): any` breaks a genuine circular type reference: tailor_works already
    // points back here via order_photo_id (a work can be promoted FROM an order
    // photo), and now order_photos points at tailor_works. Same escape hatch
    // group_orders.owner_member_id uses for the same reason.
    sourceWorkId: uuid('source_work_id').references((): any => tailorWorks.id, {
      onDelete: 'set null',
    }),
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
