import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  numeric,
  char,
  integer,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tailors, users } from './users';
import { clients } from './clients';
import { fabrics } from './fabrics';
import { groupOrderStatusEnum, orderStatusEnum } from './enums';

export const groupOrders = pgTable(
  'group_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    sharedDesignNotes: text('shared_design_notes'),
    sharedFabricId: uuid('shared_fabric_id').references(() => fabrics.id, {
      onDelete: 'set null',
    }),
    ownerMemberId: uuid('owner_member_id').references(
      (): any => groupOrderMembers.id,
      { onDelete: 'set null' },
    ),
    eventDate: timestamp('event_date', { withTimezone: true }),
    dateDelivery: timestamp('date_delivery', { withTimezone: true }),
    status: groupOrderStatusEnum('status').notNull().default('planning'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
    currency: char('currency', { length: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('group_orders_tailor_id_idx').on(t.tailorId),
    statusIdx: index('group_orders_status_idx').on(t.status),
    ownerMemberIdx: index('group_orders_owner_member_id_idx').on(t.ownerMemberId),
  }),
);

export const groupOrderMembers = pgTable(
  'group_order_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupOrderId: uuid('group_order_id')
      .notNull()
      .references(() => groupOrders.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    fullName: text('full_name').notNull(),
    roleLabel: text('role_label'),
    measurements: jsonb('measurements').notNull().default({}),
    notes: text('notes'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupOrderIdIdx: index('group_order_members_group_order_id_idx').on(t.groupOrderId),
    clientIdIdx: index('group_order_members_client_id_idx').on(t.clientId),
    positionIdx: index('group_order_members_position_idx').on(t.groupOrderId, t.position),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tailorId: uuid('tailor_id')
      .notNull()
      .references(() => tailors.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    groupOrderId: uuid('group_order_id').references(() => groupOrders.id, {
      onDelete: 'set null',
    }),
    groupOrderMemberId: uuid('group_order_member_id').references(
      () => groupOrderMembers.id,
      { onDelete: 'set null' },
    ),
    orderName: text('order_name').notNull(),
    dateOrdered: timestamp('date_ordered', { withTimezone: true }).notNull().defaultNow(),
    dateDelivery: timestamp('date_delivery', { withTimezone: true }),
    status: orderStatusEnum('status').notNull().default('registered'),
    notes: text('notes'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
    currency: char('currency', { length: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tailorIdIdx: index('orders_tailor_id_idx').on(t.tailorId),
    clientIdIdx: index('orders_client_id_idx').on(t.clientId),
    groupOrderIdIdx: index('orders_group_order_id_idx').on(t.groupOrderId),
    groupOrderMemberIdIdx: index('orders_group_order_member_id_idx').on(t.groupOrderMemberId),
    statusIdx: index('orders_status_idx').on(t.status),
    dateDeliveryIdx: index('orders_date_delivery_idx').on(t.dateDelivery),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    garmentType: text('garment_type').notNull(),
    measurements: jsonb('measurements'),
    notes: text('notes'),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
  },
  (t) => ({
    orderIdIdx: index('order_items_order_id_idx').on(t.orderId),
    quantityCheck: check('order_items_quantity_check', sql`${t.quantity} > 0`),
  }),
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdIdx: index('order_events_order_id_idx').on(t.orderId),
    createdAtIdx: index('order_events_created_at_idx').on(t.createdAt),
  }),
);
