import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { tailors } from './users';
import { orderPhotos } from './order-photos';
import { orders } from './orders';
import { workAudienceEnum, workOccasionEnum, workSourceEnum } from './enums';

/**
 * "My Designs" — the tailor's portfolio of work they actually MADE.
 *
 * Not to be confused with `designs`, which is the Design Studio: inspiration
 * collected from elsewhere. This table is their own finished pieces, and it is
 * what feeds the public discovery feed.
 *
 * The image referenced here is always PRIVATE — either in the `works` bucket
 * (direct upload) or the `order-photos` bucket (adopted from a finished
 * order), which is why `storageBucket` is stored explicitly. Publishing copies
 * a derivative into the public `feed` bucket and creates a feed_posts row; the
 * original never becomes publicly addressable.
 */
export const tailorWorks = pgTable(
  'tailor_works',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),

    source: workSourceEnum('source').notNull().default('upload'),
    storageBucket: text('storage_bucket').notNull().default('works'),
    storagePath: text('storage_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    width: integer('width'),
    height: integer('height'),

    orderPhotoId: uuid('order_photo_id').references(() => orderPhotos.id, {
      onDelete: 'set null',
    }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),

    // All nullable: a tailor should be able to save a photo now and describe it
    // later, rather than being blocked by a form at the moment of capture.
    title: text('title'),
    garmentType: text('garment_type'),
    audience: workAudienceEnum('audience'),
    fabric: text('fabric'),
    occasion: workOccasionEnum('occasion'),
    tags: jsonb('tags').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorCreatedIdx: index('tailor_works_tailor_created_idx').on(
      t.tailorId,
      t.createdAt,
      t.id,
    ),
    garmentTypeIdx: index('tailor_works_garment_type_idx').on(t.garmentType),
    audienceIdx: index('tailor_works_audience_idx').on(t.audience),
    occasionIdx: index('tailor_works_occasion_idx').on(t.occasion),
  }),
);
