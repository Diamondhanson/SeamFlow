import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import {
  clients,
  fabrics,
  groupOrders,
  invoices,
  orderItems,
  orders,
  tailors,
} from '../db/schema';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceUpdateInput,
  InvoiceWithContext,
  PublicInvoiceResponse,
} from '@seamflow/schemas';

const DEFAULT_TTL_DAYS = 60;
const TOKEN_ISSUER = 'seamflow:invoice-link';

interface InvoicePayload {
  iid: string; // invoice id
  tid: string; // tailor id (sanity check on verify)
  iat: number;
  exp: number;
  iss: string;
}

export interface IssuedInvoiceLink {
  url: string;
  token: string;
  expiresAt: string;
}

type InvoiceRow = typeof invoices.$inferSelect;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly secret: string;
  private readonly webBaseUrl: string;

  constructor(
    config: ConfigService,
    private readonly dbService: DbService,
  ) {
    this.secret = config.getOrThrow<string>('SHARE_LINK_JWT_SECRET');
    this.webBaseUrl = config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000';
  }

  // --------------------------------------------------------------------------

  async list(tailorId: string): Promise<InvoiceWithContext[]> {
    const rows = await this.dbService.db
      .select({
        ...getTableColumns(invoices),
        orderName: orders.orderName,
        clientName: clients.fullName,
      })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .innerJoin(clients, eq(clients.id, orders.clientId))
      .where(eq(invoices.tailorId, tailorId))
      .orderBy(desc(invoices.createdAt));
    return rows.map(({ orderName, clientName, ...inv }) => ({
      ...this.toApi(inv),
      orderName,
      clientName,
    }));
  }

  async getById(tailorId: string, id: string): Promise<InvoiceWithContext> {
    const rows = await this.dbService.db
      .select({
        ...getTableColumns(invoices),
        orderName: orders.orderName,
        clientName: clients.fullName,
      })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .innerJoin(clients, eq(clients.id, orders.clientId))
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Invoice ${id} not found`);
    const { orderName, clientName, ...inv } = row;
    return { ...this.toApi(inv), orderName, clientName };
  }

  /**
   * Create (or return the existing) invoice for an order. A fresh invoice is a
   * `draft` pre-filled with one `garment` line per order item — priced from the
   * item's `unitPrice` when set, otherwise 0 for the tailor to fill in.
   */
  async createForOrder(tailorId: string, orderId: string): Promise<InvoiceWithContext> {
    const [order] = await this.dbService.db
      .select()
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, orderId)))
      .limit(1);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const [existing] = await this.dbService.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.orderId, orderId)))
      .limit(1);
    if (existing) return this.getById(tailorId, existing.id);

    const [items, [tailor], [{ count }]] = await Promise.all([
      this.dbService.db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
      this.dbService.db
        .select({ currency: tailors.currency })
        .from(tailors)
        .where(eq(tailors.id, tailorId))
        .limit(1),
      this.dbService.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(eq(invoices.tailorId, tailorId)),
    ]);

    const lineItems: InvoiceLineItem[] = items.map((it) => ({
      id: randomUUID(),
      category: 'garment',
      description: it.garmentType,
      quantity: it.quantity,
      unitPrice: it.unitPrice != null ? Number(it.unitPrice) : 0,
    }));

    // Pre-fill a fabric line from the order's fabric (or its group's shared
    // fabric). Invoice quantity is an integer, so we fold yardage into the unit
    // price: unitPrice = costPerMeter × metersUsed (or one meter's cost when no
    // yardage was recorded). Fully editable afterwards.
    const fabricLine = await this.buildFabricLine(order);
    if (fabricLine) lineItems.push(fabricLine);

    const total = this.subtotal(lineItems);
    const number = `INV-${String(count + 1).padStart(4, '0')}`;

    const [row] = await this.dbService.db
      .insert(invoices)
      .values({
        tailorId,
        orderId,
        number,
        status: 'draft',
        currency: order.currency ?? tailor?.currency ?? null,
        lineItems,
        deposit: '0',
        total: String(total),
      })
      .returning();
    return this.getById(tailorId, row.id);
  }

  async update(
    tailorId: string,
    id: string,
    data: InvoiceUpdateInput,
  ): Promise<InvoiceWithContext> {
    const current = await this.getById(tailorId, id);

    const patch: Partial<typeof invoices.$inferInsert> = { updatedAt: new Date() };
    if (data.lineItems !== undefined) {
      patch.lineItems = data.lineItems;
      patch.total = String(this.subtotal(data.lineItems));
    }
    if (data.deposit !== undefined) patch.deposit = String(data.deposit);
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status !== undefined) patch.status = data.status;

    await this.dbService.db
      .update(invoices)
      .set(patch)
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.id, id)));
    return this.getById(tailorId, current.id);
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db
      .delete(invoices)
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.id, id)));
  }

  /** Mint a public link. Flips draft → sent + stamps issued_at on first send. */
  async issueLink(tailorId: string, id: string): Promise<IssuedInvoiceLink> {
    const [inv] = await this.dbService.db
      .select({ id: invoices.id, issuedAt: invoices.issuedAt })
      .from(invoices)
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.id, id)))
      .limit(1);
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + DEFAULT_TTL_DAYS * 24 * 60 * 60;
    const token = jwt.sign({ iid: id, tid: tailorId }, this.secret, {
      expiresIn: `${DEFAULT_TTL_DAYS}d`,
      issuer: TOKEN_ISSUER,
    });

    await this.dbService.db
      .update(invoices)
      .set({
        status: 'sent',
        issuedAt: inv.issuedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.tailorId, tailorId), eq(invoices.id, id)));

    return {
      url: `${this.webBaseUrl.replace(/\/$/, '')}/i/${token}`,
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  /** Public — resolve a token to the client-facing invoice. No auth. */
  async resolvePublic(token: string): Promise<PublicInvoiceResponse> {
    let payload: InvoicePayload;
    try {
      payload = jwt.verify(token, this.secret, { issuer: TOKEN_ISSUER }) as InvoicePayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new GoneException('This link has expired');
      }
      throw new UnauthorizedException('Invalid invoice link');
    }

    const [row] = await this.dbService.db
      .select({
        ...getTableColumns(invoices),
        orderName: orders.orderName,
        clientName: clients.fullName,
        businessName: tailors.businessName,
        location: tailors.location,
      })
      .from(invoices)
      .innerJoin(orders, eq(orders.id, invoices.orderId))
      .innerJoin(clients, eq(clients.id, orders.clientId))
      .innerJoin(tailors, eq(tailors.id, invoices.tailorId))
      .where(eq(invoices.id, payload.iid))
      .limit(1);
    if (!row) throw new NotFoundException('Invoice not found');
    if (row.tailorId !== payload.tid) {
      throw new UnauthorizedException('Invalid invoice link');
    }

    const inv = this.toApi(row);
    return {
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      lineItems: inv.lineItems,
      deposit: inv.deposit,
      total: inv.total,
      notes: inv.notes,
      issuedAt: inv.issuedAt,
      createdAt: inv.createdAt,
      order: { orderName: row.orderName },
      client: { fullName: row.clientName },
      tailor: { businessName: row.businessName, location: row.location },
      effectiveExpiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  }

  // --------------------------------------------------------------------------

  private subtotal(lines: InvoiceLineItem[]): number {
    return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  }

  /**
   * Build the pre-filled fabric line for an order, or null when no fabric is
   * attached. Prefers the order's own fabric; falls back to the group's shared
   * fabric. Yardage is folded into the unit price because invoice quantities
   * are integers.
   */
  private async buildFabricLine(
    order: typeof orders.$inferSelect,
  ): Promise<InvoiceLineItem | null> {
    let fabricId = order.fabricId;
    const yardage =
      order.fabricYardageUsed != null ? Number(order.fabricYardageUsed) : null;

    if (!fabricId && order.groupOrderId) {
      const [group] = await this.dbService.db
        .select({ sharedFabricId: groupOrders.sharedFabricId })
        .from(groupOrders)
        .where(eq(groupOrders.id, order.groupOrderId))
        .limit(1);
      fabricId = group?.sharedFabricId ?? null;
    }
    if (!fabricId) return null;

    const [fabric] = await this.dbService.db
      .select()
      .from(fabrics)
      .where(eq(fabrics.id, fabricId))
      .limit(1);
    if (!fabric) return null;

    const costPerMeter =
      fabric.costPerMeter != null ? Number(fabric.costPerMeter) : 0;
    const unitPrice =
      yardage != null && yardage > 0
        ? Math.round(costPerMeter * yardage * 100) / 100
        : costPerMeter;
    const description = [
      fabric.name,
      fabric.color ? `— ${fabric.color}` : '',
      yardage != null && yardage > 0 ? `(${yardage} m)` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: randomUUID(),
      category: 'fabric',
      description,
      quantity: 1,
      unitPrice,
    };
  }

  /** DB row → API shape: numeric strings → numbers, dates → ISO. */
  private toApi(row: InvoiceRow): Invoice {
    return {
      id: row.id,
      tailorId: row.tailorId,
      orderId: row.orderId,
      number: row.number,
      status: row.status,
      currency: row.currency,
      lineItems: (row.lineItems ?? []) as InvoiceLineItem[],
      deposit: Number(row.deposit),
      notes: row.notes,
      total: Number(row.total),
      issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
