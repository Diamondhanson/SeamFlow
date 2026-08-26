import { pgTable, uuid, text, timestamp, index, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { tailorWorks } from './tailor-works';
import { feedPosts } from './feed-posts';

/**
 * The photos that make up one design — front, back, side.
 *
 * Private. Each row points into the `works` bucket (direct upload) or
 * `order-photos` (adopted from a finished order), which is why the bucket is
 * stored per image rather than per design: a tailor can adopt an order photo
 * and then add two more angles from their gallery, and those live in different
 * buckets.
 *
 * `position` is contiguous from 0 and **position 0 is the cover** — mirrored
 * onto `tailor_works.storage_path` so any reader that wants one representative
 * image does not have to join. WorksService owns that invariant; nothing else
 * should write either side of it.
 */
export const tailorWorkImages = pgTable(
  'tailor_work_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workId: uuid('work_id')
      .notNull()
      .references(() => tailorWorks.id, { onDelete: 'cascade' }),
    storageBucket: text('storage_bucket').notNull().default('works'),
    storagePath: text('storage_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    width: integer('width'),
    height: integer('height'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workPositionIdx: index('tailor_work_images_work_position_idx').on(t.workId, t.position),
    workPositionKey: uniqueIndex('tailor_work_images_work_position_key').on(
      t.workId,
      t.position,
    ),
  }),
);

/**
 * The public copies of those photos, in the `feed` bucket.
 *
 * Deliberately a separate table from `tailor_work_images` rather than a flag on
 * it. The rule feed_posts was built around is that a public read never touches
 * a private table; publishing COPIES pixels and rows across the boundary, and
 * unpublishing deletes both. An unpublished angle is genuinely unreachable, not
 * merely unlisted.
 */
export const feedPostImages = pgTable(
  'feed_post_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedPostId: uuid('feed_post_id')
      .notNull()
      .references(() => feedPosts.id, { onDelete: 'cascade' }),
    publicPath: text('public_path').notNull(),
    publicThumbPath: text('public_thumb_path').notNull(),
    width: integer('width'),
    height: integer('height'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    postPositionIdx: index('feed_post_images_post_position_idx').on(t.feedPostId, t.position),
    postPositionKey: uniqueIndex('feed_post_images_post_position_key').on(
      t.feedPostId,
      t.position,
    ),
  }),
);
