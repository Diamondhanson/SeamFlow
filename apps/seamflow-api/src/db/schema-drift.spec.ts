// Does the published contract still match the database?
//
// The API validates every request body against the Zod schemas in
// @seamflow/schemas and validates NO response at all. So the app's typed client
// declares what it expects, the API declares what it returns, and the two are
// written independently against the same schema with nothing checking they
// agree. A column renamed or dropped compiles cleanly on both sides and first
// shows up as `undefined` on a tailor's screen.
//
// TypeScript types do not exist at runtime, so a test cannot compare them. What
// does exist is the Drizzle table (its columns) and the Zod schema (its shape),
// and comparing those catches the drift that actually happens.
//
// The assertion runs in ONE direction on purpose: every field the schema
// PROMISES must exist as a column. A column the schema omits is fine and
// common — internal bookkeeping the wire format has no business carrying.

import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  ClientSchema,
  FabricSchema,
  GroupOrderSchema,
  InvoiceSchema,
  OrderItemSchema,
  OrderSchema,
  TailorSchema,
  UserSchema,
} from '@seamflow/schemas';
import {
  clients,
  fabrics,
  groupOrders,
  invoices,
  orderItems,
  orders,
  tailors,
  users,
} from './schema';

/** Keys the wire format adds that are not columns, with why. */
const COMPUTED: Record<string, string[]> = {
  // Signed URLs are minted per request; they are not stored.
  fabrics: ['signedUrl', 'thumbnailUrl'],
  invoices: ['items'],
  orders: ['items', 'events'],
};

const PAIRS: [string, { shape: Record<string, unknown> }, object][] = [
  ['users', UserSchema as never, users],
  ['tailors', TailorSchema as never, tailors],
  ['clients', ClientSchema as never, clients],
  ['orders', OrderSchema as never, orders],
  ['orderItems', OrderItemSchema as never, orderItems],
  ['groupOrders', GroupOrderSchema as never, groupOrders],
  ['fabrics', FabricSchema as never, fabrics],
  ['invoices', InvoiceSchema as never, invoices],
];

describe('the published schema and the database agree', () => {
  it.each(PAIRS)('%s: every promised field is a real column', (name, schema, table) => {
    const columns = new Set(Object.keys(getTableColumns(table as never)));
    const allowed = new Set(COMPUTED[name] ?? []);

    const promised = Object.keys(schema.shape);
    const missing = promised.filter((k) => !columns.has(k) && !allowed.has(k));

    expect(
      missing,
      `${name}: the schema promises ${missing.join(', ')}, which the table does not have. ` +
        `Either the column was renamed or dropped, or the schema gained a computed field — ` +
        `if computed, add it to COMPUTED in this file with a reason.`,
    ).toEqual([]);
  });

  it('finds the tables at all, so a passing suite means something', () => {
    // Guards against an import going undefined and every case vacuously passing.
    for (const [name, schema, table] of PAIRS) {
      expect(Object.keys(getTableColumns(table as never)).length, name).toBeGreaterThan(2);
      expect(Object.keys(schema.shape).length, name).toBeGreaterThan(2);
    }
  });
});
