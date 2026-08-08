import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
  integer,
  numeric,
  char,
} from 'drizzle-orm/pg-core';
import { tailors } from './users';
import { orderPhotos } from './order-photos';
import { feedPostStatusEnum, workAudienceEnum, workOccasionEnum } from './enums';
import { tailorWorks } from './tailor-works';

/**
 * A tailor-approved public showcase image (ROADMAP D.1.1).
 *
 * Deliberately denormalised: the public feed query must never touch a private
 * table, so `city` and both image paths are copied here at publish time. The
 * paths point into the PUBLIC `feed` bucket — derivatives copied on publish,
 * never the private order-photo original (D.5).
 *
 * `width`/`height` come from the source photo so the masonry grid can reserve
 * space before an image loads; without them the feed reflows constantly.
 */
export const feedPosts = pgTable(
  'feed_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    // Nullable so a future standalone upload (not derived from an order) fits.
    orderPhotoId: uuid('order_photo_id').references(() => orderPhotos.id, {
      onDelete: 'set null',
    }),
    /** The portfolio entry this post publishes. Null for legacy order-photo posts. */
    workId: uuid('work_id').references(() => tailorWorks.id, { onDelete: 'cascade' }),
    publicPath: text('public_path').notNull(),
    publicThumbPath: text('public_thumb_path').notNull(),
    width: integer('width'),
    height: integer('height'),
    caption: text('caption'),
    garmentType: text('garment_type'),
    tags: jsonb('tags').notNull().default([]),
    fabric: text('fabric'),
    startingPrice: numeric('starting_price', { precision: 12, scale: 2 }),
    currency: char('currency', { length: 3 }),
    city: text('city'),
    // Denormalised from the work so the public feed can filter without a join.
    audience: workAudienceEnum('audience'),
    occasion: workOccasionEnum('occasion'),
    // 'hidden' = tailor unpublished it; 'removed' = taken down by moderation.
    status: feedPostStatusEnum('status').notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCreatedIdx: index('feed_posts_status_created_idx').on(
      t.status,
      t.createdAt,
      t.id,
    ),
    garmentTypeIdx: index('feed_posts_garment_type_idx').on(t.garmentType),
    tailorIdIdx: index('feed_posts_tailor_id_idx').on(t.tailorId),
    cityIdx: index('feed_posts_city_idx').on(t.city),
  }),
);
