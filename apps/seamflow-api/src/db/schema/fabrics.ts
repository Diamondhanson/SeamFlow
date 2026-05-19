import { pgTable, uuid, text, timestamp, index, numeric } from 'drizzle-orm/pg-core';
import { tailors } from './users';

export const fabrics = pgTable(
  'fabrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    supplier: text('supplier'),
    color: text('color'),
    composition: text('composition'),
    yardageMeters: numeric('yardage_meters', { precision: 10, scale: 2 }),
    costPerMeter: numeric('cost_per_meter', { precision: 12, scale: 2 }),
    photoKey: text('photo_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('fabrics_tailor_id_idx').on(t.tailorId),
  }),
);
