// ============================================================================
// Tailor copilot — the tool registry (docs/tailor-copilot-plan.md §2–3).
//
// Every capability the assistant has is one entry here, uniform shape:
//   read  → `run()` executes immediately, tenant-scoped, and returns a
//           TRIMMED PROJECTION (never raw rows — see "tool output discipline"
//           in the plan): 4–6 fields, row cap, `truncated` marker.
//   write → `preview()` validates ids + args and returns an ActionPreview.
//           The server NEVER mutates from the model's word; the app renders a
//           confirm card and executes through the normal api-client call.
//
// Write tools accept RESOLVED IDS ONLY (clientId, not "Kofi") — the model
// resolves names via the read tools first, and does its own date math from
// the date in the system prompt. `display` carries resolved human names so
// the app composes the localized confirm card from structured values, never
// from model prose.
//
// Adding a capability later = appending one entry. Nothing else changes.
// ============================================================================

import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  canTransitionOrderStatus,
  nextOrderStatuses,
  OrderStatusSchema,
  type ActionPreview,
  type OrderStatus,
} from '@seamflow/schemas';
import { ClientsService } from '../clients/clients.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { MeasurementSetsService } from '../measurement-sets/measurement-sets.service';
import { GroupOrdersService } from '../group-orders/group-orders.service';
import { FabricsService } from '../fabrics/fabrics.service';

export interface ToolCtx {
  tailorId: string;
}

/** Anthropic-facing JSON schema for a tool's input (hand-written — small,
 *  and avoids a zod→json-schema dependency). Matches the SDK's InputSchema. */
interface JsonSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [k: string]: unknown;
}

export interface CopilotTool {
  name: string;
  /** WHEN to use it — this is what the model reads. */
  description: string;
  inputSchema: JsonSchema;
  kind: 'read' | 'write';
  run?: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<unknown>;
  preview?: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<ActionPreview>;
}

/** Row cap for every list-shaped read tool (tool output discipline). */
const ROW_CAP = 20;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown for bad tool args — surfaced back to the model as a tool error so
 *  it can recover (re-search, ask the tailor), never a crashed turn. */
export class ToolArgError extends Error {}

function reqId(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !UUID_RE.test(v)) {
    throw new ToolArgError(
      `${key} must be a UUID from a previous search/get tool result. Look the record up first.`,
    );
  }
  return v;
}

function optStr(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = optStr(args, key);
  if (!v) throw new ToolArgError(`${key} is required.`);
  return v;
}

/** Accept "2026-08-01" or a full ISO datetime; normalize to ISO datetime. */
function optIsoDate(args: Record<string, unknown>, key: string): string | undefined {
  const v = optStr(args, key);
  if (!v) return undefined;
  const full = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00.000Z` : v;
  if (Number.isNaN(Date.parse(full))) {
    throw new ToolArgError(`${key} must be an ISO date (YYYY-MM-DD).`);
  }
  return new Date(full).toISOString();
}

function truncate(rows: unknown[], total: number) {
  return total > rows.length ? { truncated: total - rows.length } : {};
}

/** Drizzle rows carry `Date` objects; API-shaped payloads carry ISO strings.
 *  Accept both and emit a compact YYYY-MM-DD (or null). */
function fmtDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function timeOf(d: Date | string | null | undefined): number {
  if (!d) return NaN;
  return (typeof d === 'string' ? new Date(d) : d).getTime();
}

@Injectable()
export class AssistantToolsService {
  constructor(
    private readonly clients: ClientsService,
    private readonly orders: OrdersService,
    private readonly invoices: InvoicesService,
    private readonly measurementSets: MeasurementSetsService,
    private readonly groupOrders: GroupOrdersService,
    private readonly fabrics: FabricsService,
  ) {}

  // --------------------------------------------------------------------------
  // Registry
  // --------------------------------------------------------------------------

  readonly tools: CopilotTool[] = [
    // ---------------- READ ----------------
    {
      name: 'search_clients',
      description:
        'Search the tailor\'s clients by name or phone. Use this to resolve a client name to a clientId before any client-related action.',
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Name or phone fragment. Omit to list recent clients.' },
        },
      },
      run: async (ctx, args) => {
        const rows = await this.clients.list(ctx.tailorId, {
          limit: ROW_CAP,
          offset: 0,
          q: optStr(args, 'q'),
        });
        return {
          clients: rows.map((c) => ({ id: c.id, name: c.fullName, phone: c.phone })),
        };
      },
    },
    {
      name: 'get_client',
      description: 'Full profile of one client by clientId.',
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: { clientId: { type: 'string' } },
        required: ['clientId'],
      },
      run: async (ctx, args) => {
        const c = await this.clients.getById(ctx.tailorId, reqId(args, 'clientId'));
        return {
          id: c.id,
          name: c.fullName,
          phone: c.phone,
          address: c.address,
          email: c.email,
          notes: c.notes,
        };
      },
    },
    {
      name: 'search_orders',
      description:
        "Search the tailor's orders. Filters: status (registered | in_progress | testing | on_pause | delivered), clientId, free-text name match, and due-date range (ISO). Use for \"what's due…\", \"orders for X\", \"orders in fitting\".",
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: {
          status: { enum: ['registered', 'in_progress', 'testing', 'on_pause', 'delivered'] },
          clientId: { type: 'string' },
          q: { type: 'string', description: 'Matches the order name.' },
          dueBefore: { type: 'string', description: 'ISO date — delivery due on/before.' },
          dueAfter: { type: 'string', description: 'ISO date — delivery due on/after.' },
        },
      },
      run: async (ctx, args) => {
        const status = optStr(args, 'status');
        const rows = await this.orders.list(ctx.tailorId, {
          limit: ROW_CAP,
          offset: 0,
          status: status ? OrderStatusSchema.parse(status) : undefined,
          clientId: args.clientId ? reqId(args, 'clientId') : undefined,
          q: optStr(args, 'q'),
          dueBefore: optIsoDate(args, 'dueBefore'),
          dueAfter: optIsoDate(args, 'dueAfter'),
        });
        return {
          orders: rows.map((o) => ({
            id: o.id,
            name: o.orderName,
            status: o.status,
            due: fmtDate(o.dateDelivery),
            clientId: o.clientId,
          })),
        };
      },
    },
    {
      name: 'get_order',
      description: 'One order in detail by orderId: status, dates, notes, items, recent status history.',
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      run: async (ctx, args) => {
        const o = await this.orders.getDetail(ctx.tailorId, reqId(args, 'orderId'));
        return {
          id: o.id,
          name: o.orderName,
          status: o.status,
          ordered: fmtDate(o.dateOrdered),
          due: fmtDate(o.dateDelivery),
          notes: o.notes,
          total: o.totalAmount,
          currency: o.currency,
          clientId: o.clientId,
          items: o.items.slice(0, ROW_CAP).map((i) => ({
            id: i.id,
            garment: i.garmentType,
            qty: i.quantity,
            unitPrice: i.unitPrice,
          })),
          recentEvents: o.events.slice(0, 5).map((e) => ({
            type: e.eventType,
            to: e.toStatus,
            at: fmtDate(e.createdAt),
          })),
        };
      },
    },
    {
      name: 'get_client_measurements',
      description: "A client's saved measurement sets (by clientId): labels, units and values.",
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: { clientId: { type: 'string' } },
        required: ['clientId'],
      },
      run: async (ctx, args) => {
        const sets = await this.measurementSets.listForClient(
          ctx.tailorId,
          reqId(args, 'clientId'),
        );
        return {
          sets: sets.slice(0, 10).map((s) => ({
            id: s.id,
            label: s.label,
            unit: s.unitPreference,
            values: s.values,
          })),
          ...truncate(sets.slice(0, 10), sets.length),
        };
      },
    },
    {
      name: 'list_invoices',
      description:
        "The tailor's invoices with totals and deposit; balance due = total − deposit. Status: draft (not sent) or sent.",
      kind: 'read',
      inputSchema: { type: 'object', properties: {} },
      run: async (ctx) => {
        const rows = await this.invoices.list(ctx.tailorId);
        const top = rows.slice(0, ROW_CAP);
        return {
          invoices: top.map((i) => ({
            id: i.id,
            number: i.number,
            status: i.status,
            client: i.clientName,
            order: i.orderName,
            total: i.total,
            deposit: i.deposit,
            balanceDue: Math.max(0, i.total - i.deposit),
            currency: i.currency,
          })),
          ...truncate(top, rows.length),
        };
      },
    },
    {
      name: 'list_fabrics',
      description: "The tailor's fabric stock (names + ids).",
      kind: 'read',
      inputSchema: { type: 'object', properties: {} },
      run: async (ctx) => {
        const rows = await this.fabrics.list(ctx.tailorId);
        const top = rows.slice(0, ROW_CAP);
        return {
          fabrics: top.map((f) => ({ id: f.id, name: f.name })),
          ...truncate(top, rows.length),
        };
      },
    },
    {
      name: 'list_group_orders',
      description: "The tailor's group orders (events like weddings): name, event date, status.",
      kind: 'read',
      inputSchema: { type: 'object', properties: {} },
      run: async (ctx) => {
        const rows = await this.groupOrders.list(ctx.tailorId, {
          limit: ROW_CAP,
          offset: 0,
        });
        return {
          groupOrders: rows.map((g) => ({
            id: g.id,
            name: g.name,
            eventDate: fmtDate(g.eventDate),
            status: g.status,
          })),
        };
      },
    },
    {
      name: 'get_group_order',
      description: 'One group order with its members, by groupOrderId.',
      kind: 'read',
      inputSchema: {
        type: 'object',
        properties: { groupOrderId: { type: 'string' } },
        required: ['groupOrderId'],
      },
      run: async (ctx, args) => {
        const g = await this.groupOrders.getWithMembers(
          ctx.tailorId,
          reqId(args, 'groupOrderId'),
        );
        return {
          id: g.id,
          name: g.name,
          eventDate: fmtDate(g.eventDate),
          status: g.status,
          members: g.members.slice(0, ROW_CAP).map((m) => ({
            id: m.id,
            name: m.fullName,
            clientId: m.clientId,
          })),
        };
      },
    },
    {
      name: 'business_summary',
      description:
        'Aggregate overview: order counts by status, orders due in the next 7 days, overdue orders, and invoice totals (who owes what, from invoice balances). Use for "how\'s business", "what\'s due this week", "who owes me".',
      kind: 'read',
      inputSchema: { type: 'object', properties: {} },
      run: async (ctx) => {
        const [orders, invoices] = await Promise.all([
          this.orders.list(ctx.tailorId, { limit: 200, offset: 0 }),
          this.invoices.list(ctx.tailorId),
        ]);
        const byStatus: Record<string, number> = {};
        for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

        const now = Date.now();
        const weekAhead = now + 7 * 24 * 3600 * 1000;
        const open = orders.filter((o) => o.status !== 'delivered');
        const dueSoon = open
          .filter((o) => {
            const t = timeOf(o.dateDelivery);
            return !Number.isNaN(t) && t >= now && t <= weekAhead;
          })
          .slice(0, 10)
          .map((o) => ({ id: o.id, name: o.orderName, due: fmtDate(o.dateDelivery), status: o.status }));
        const overdue = open.filter((o) => {
          const t = timeOf(o.dateDelivery);
          return !Number.isNaN(t) && t < now;
        });

        // Each row carries its OWN currency and there is deliberately no
        // grand total here. Invoices are denominated per-invoice, and this
        // tailor may legitimately have one in XAF and one in EUR — adding
        // those produces a number that means nothing. If a total is ever
        // wanted, group by currency or convert through a real rate; do not
        // reduce these into a single figure.
        const owed = invoices
          .filter((i) => i.status === 'sent' && i.total - i.deposit > 0)
          .slice(0, 10)
          .map((i) => ({
            number: i.number,
            client: i.clientName,
            balanceDue: i.total - i.deposit,
            currency: i.currency,
          }));

        return {
          note: 'Money figures come from invoice balances (total − deposit); actual payment tracking is not enabled yet.',
          ordersByStatus: byStatus,
          openOrders: open.length,
          dueNext7Days: dueSoon,
          overdueCount: overdue.length,
          invoices: {
            draft: invoices.filter((i) => i.status === 'draft').length,
            sent: invoices.filter((i) => i.status === 'sent').length,
            outstanding: owed,
          },
        };
      },
    },

    // ---------------- WRITE (propose + confirm; never executed here) ----------------
    {
      name: 'create_client',
      description:
        'Propose creating a new client. Requires fullName and phone. First search_clients to make sure they do not already exist.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['fullName', 'phone'],
      },
      preview: async (_ctx, args) => {
        const fullName = reqStr(args, 'fullName');
        const phone = reqStr(args, 'phone');
        return this.makePreview('create_client', {
          args: {
            fullName,
            phone,
            address: optStr(args, 'address') ?? null,
            email: optStr(args, 'email') ?? null,
            notes: optStr(args, 'notes') ?? null,
          },
          display: { clientName: fullName, phone },
        });
      },
    },
    {
      name: 'update_client',
      description:
        'Propose updating an existing client (by clientId): phone, address, email, notes or name.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['clientId'],
      },
      preview: async (ctx, args) => {
        const clientId = reqId(args, 'clientId');
        const existing = await this.clients.getById(ctx.tailorId, clientId);
        const patch: Record<string, unknown> = {};
        for (const k of ['fullName', 'phone', 'address', 'email', 'notes'] as const) {
          const v = optStr(args, k);
          if (v !== undefined) patch[k] = v;
        }
        if (Object.keys(patch).length === 0) {
          throw new ToolArgError('Nothing to update — provide at least one field.');
        }
        return this.makePreview('update_client', {
          args: { clientId, ...patch },
          display: { clientName: existing.fullName },
        });
      },
    },
    {
      name: 'create_order',
      description:
        'Propose creating an order for an existing client. Requires clientId (resolve the name with search_clients first) and orderName. Dates are ISO (YYYY-MM-DD).',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          orderName: { type: 'string' },
          dateDelivery: { type: 'string', description: 'ISO due date.' },
          notes: { type: 'string' },
          totalAmount: { type: 'number' },
          currency: { type: 'string', description: '3-letter code, e.g. XAF.' },
        },
        required: ['clientId', 'orderName'],
      },
      preview: async (ctx, args) => {
        const clientId = reqId(args, 'clientId');
        const client = await this.clients.getById(ctx.tailorId, clientId);
        const orderName = reqStr(args, 'orderName');
        const dateDelivery = optIsoDate(args, 'dateDelivery');
        const totalAmount =
          typeof args.totalAmount === 'number' && args.totalAmount >= 0
            ? args.totalAmount
            : undefined;
        const currency = optStr(args, 'currency')?.toUpperCase();
        return this.makePreview('create_order', {
          args: {
            clientId,
            orderName,
            ...(dateDelivery ? { dateDelivery } : {}),
            ...(optStr(args, 'notes') ? { notes: optStr(args, 'notes') } : {}),
            ...(totalAmount !== undefined ? { totalAmount } : {}),
            ...(currency && currency.length === 3 ? { currency } : {}),
          },
          display: {
            clientName: client.fullName,
            orderName,
            ...(dateDelivery ? { due: dateDelivery.slice(0, 10) } : {}),
          },
        });
      },
    },
    {
      name: 'update_order',
      description:
        'Propose updating an order (by orderId): name, due date, notes or total. NOT for status changes — use set_order_status.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          orderName: { type: 'string' },
          dateDelivery: { type: 'string' },
          notes: { type: 'string' },
          totalAmount: { type: 'number' },
        },
        required: ['orderId'],
      },
      preview: async (ctx, args) => {
        const orderId = reqId(args, 'orderId');
        const existing = await this.orders.getById(ctx.tailorId, orderId);
        const patch: Record<string, unknown> = {};
        const name = optStr(args, 'orderName');
        if (name) patch.orderName = name;
        const due = optIsoDate(args, 'dateDelivery');
        if (due) patch.dateDelivery = due;
        const notes = optStr(args, 'notes');
        if (notes) patch.notes = notes;
        if (typeof args.totalAmount === 'number' && args.totalAmount >= 0) {
          patch.totalAmount = args.totalAmount;
        }
        if (Object.keys(patch).length === 0) {
          throw new ToolArgError('Nothing to update — provide at least one field.');
        }
        return this.makePreview('update_order', {
          args: { orderId, ...patch },
          display: {
            orderName: existing.orderName,
            ...(due ? { due: due.slice(0, 10) } : {}),
          },
        });
      },
    },
    {
      name: 'set_order_status',
      description:
        'Propose moving an order (by orderId) to a new status: registered | in_progress | testing | on_pause | delivered. The order status state machine is enforced.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          to: { enum: ['registered', 'in_progress', 'testing', 'on_pause', 'delivered'] },
        },
        required: ['orderId', 'to'],
      },
      preview: async (ctx, args) => {
        const orderId = reqId(args, 'orderId');
        const to = OrderStatusSchema.parse(reqStr(args, 'to')) as OrderStatus;
        const existing = await this.orders.getById(ctx.tailorId, orderId);
        if (!canTransitionOrderStatus(existing.status, to)) {
          throw new ToolArgError(
            `Cannot move "${existing.orderName}" from ${existing.status} to ${to}. Allowed next statuses: ${nextOrderStatuses(existing.status).join(', ') || 'none'}.`,
          );
        }
        return this.makePreview('set_order_status', {
          args: { orderId, to },
          display: {
            orderName: existing.orderName,
            fromStatus: existing.status,
            toStatus: to,
          },
        });
      },
    },
    {
      name: 'add_measurements',
      description:
        'Propose saving a measurement set to a client (by clientId). values is an object of measurement name → positive number. unit is cm or in.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          label: { type: 'string' },
          values: {
            type: 'object',
            additionalProperties: { type: 'number' },
            description: 'e.g. {"chest": 96, "waist": 78}',
          },
          unit: { enum: ['cm', 'in'] },
        },
        required: ['clientId', 'values'],
      },
      preview: async (ctx, args) => {
        const clientId = reqId(args, 'clientId');
        const client = await this.clients.getById(ctx.tailorId, clientId);
        const raw = args.values;
        const values: Record<string, number> = {};
        if (raw && typeof raw === 'object') {
          for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (k.trim() && typeof v === 'number' && Number.isFinite(v) && v > 0) {
              values[k.trim()] = v;
            }
          }
        }
        if (Object.keys(values).length === 0) {
          throw new ToolArgError('values must contain at least one positive number.');
        }
        const unit = optStr(args, 'unit') === 'in' ? 'in' : 'cm';
        const label = optStr(args, 'label') ?? 'default';
        return this.makePreview('add_measurements', {
          args: { clientId, label, values, unitPreference: unit },
          display: {
            clientName: client.fullName,
            label,
            count: String(Object.keys(values).length),
          },
        });
      },
    },
    {
      name: 'create_invoice',
      description:
        'Propose creating (or opening the existing) invoice for an order, by orderId. Line items come from the order.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      preview: async (ctx, args) => {
        const orderId = reqId(args, 'orderId');
        const order = await this.orders.getById(ctx.tailorId, orderId);
        return this.makePreview('create_invoice', {
          args: { orderId },
          display: { orderName: order.orderName },
        });
      },
    },
    {
      name: 'mark_invoice_sent',
      description: 'Propose marking an invoice (by invoiceId) as sent.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: { invoiceId: { type: 'string' } },
        required: ['invoiceId'],
      },
      preview: async (ctx, args) => {
        const invoiceId = reqId(args, 'invoiceId');
        const inv = await this.invoices.getById(ctx.tailorId, invoiceId);
        const warnings =
          inv.status === 'sent' ? ['This invoice is already marked as sent.'] : [];
        return this.makePreview('mark_invoice_sent', {
          args: { invoiceId },
          display: { invoiceNumber: inv.number, clientName: inv.clientName ?? '' },
          warnings,
        });
      },
    },
    {
      name: 'share_order_link',
      description:
        'Propose issuing a shareable web link for an order (by orderId) the tailor can send to the client (e.g. on WhatsApp).',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      preview: async (ctx, args) => {
        const orderId = reqId(args, 'orderId');
        const order = await this.orders.getById(ctx.tailorId, orderId);
        return this.makePreview('share_order_link', {
          args: { orderId },
          display: { orderName: order.orderName },
        });
      },
    },
    {
      name: 'share_invoice_link',
      description:
        'Propose issuing a shareable payment/view link for an invoice (by invoiceId). Also marks it sent.',
      kind: 'write',
      inputSchema: {
        type: 'object',
        properties: { invoiceId: { type: 'string' } },
        required: ['invoiceId'],
      },
      preview: async (ctx, args) => {
        const invoiceId = reqId(args, 'invoiceId');
        const inv = await this.invoices.getById(ctx.tailorId, invoiceId);
        return this.makePreview('share_invoice_link', {
          args: { invoiceId },
          display: { invoiceNumber: inv.number, clientName: inv.clientName ?? '' },
        });
      },
    },
  ];

  // --------------------------------------------------------------------------
  // Lookup + Anthropic defs
  // --------------------------------------------------------------------------

  byName(name: string): CopilotTool | undefined {
    return this.tools.find((t) => t.name === name);
  }

  /** The `tools` array for messages.create. */
  get anthropicDefs(): { name: string; description: string; input_schema: JsonSchema }[] {
    return this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  private makePreview(
    tool: string,
    body: {
      args: Record<string, unknown>;
      display: Record<string, string>;
      warnings?: string[];
    },
  ): ActionPreview {
    return {
      id: randomUUID(),
      tool,
      args: body.args,
      display: body.display,
      warnings: body.warnings ?? [],
    };
  }
}
