import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tailors } from './users';

export const measurementTemplates = pgTable(
  'measurement_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    garmentType: text('garment_type'),
    description: text('description'),
    fields: jsonb('fields').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('measurement_templates_tailor_id_idx').on(t.tailorId),
    garmentTypeIdx: index('measurement_templates_garment_type_idx').on(t.garmentType),
  }),
);
