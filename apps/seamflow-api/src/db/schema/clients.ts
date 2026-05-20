import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { tailors } from './users';
import { measurementTemplates } from './templates';
import { measurementUnitEnum } from './enums';

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    // Single free-form address string. Captured at create time in the
    // mobile UI; nullable in the DB so historical rows don't need backfill.
    address: text('address'),
    email: text('email'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('clients_tailor_id_idx').on(t.tailorId),
  }),
);

export const measurementSets = pgTable(
  'measurement_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => measurementTemplates.id, {
      onDelete: 'set null',
    }),
    label: text('label').notNull().default('default'),
    values: jsonb('values').notNull().default({}),
    unitPreference: measurementUnitEnum('unit_preference').notNull().default('cm'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clientIdIdx: index('measurement_sets_client_id_idx').on(t.clientId),
    templateIdIdx: index('measurement_sets_template_id_idx').on(t.templateId),
  }),
);
