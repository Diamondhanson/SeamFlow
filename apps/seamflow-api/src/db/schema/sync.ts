import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const syncTombstones = pgTable(
  'sync_tombstones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    tailorId: uuid('tailor_id').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorDeletedIdx: index('sync_tombstones_tailor_deleted_idx').on(t.tailorId, t.deletedAt),
    entityIdx: index('sync_tombstones_entity_idx').on(t.entityType, t.entityId),
  }),
);
