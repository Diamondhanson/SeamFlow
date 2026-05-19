import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { clients, orderEvents, orderItems, orders } from '../db/schema';
import {
  canTransitionOrderStatus,
  type OrderCreateInput,
  type OrderStatus,
  type OrderTransitionInput,
  type OrderUpdateInput,
} from '@seamflow/schemas';

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type OrderDetail = OrderRow & {
  items: OrderItemRow[];
  events: OrderEventRow[];
};

interface ListOptions {
  limit: number;
  offset: number;
  clientId?: string;
  status?: OrderStatus;
  groupOrderId?: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly dbService: DbService) {}

  private async assertClientOwned(tailorId: string, clientId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.tailorId, tailorId), eq(clients.id, clientId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Client ${clientId} not found`);
  }

  async list(tailorId: string, opts: ListOptions): Promise<OrderRow[]> {
    const filters: SQL[] = [eq(orders.tailorId, tailorId)];
    if (opts.clientId) filters.push(eq(orders.clientId, opts.clientId));
    if (opts.status) filters.push(eq(orders.status, opts.status));
    if (opts.groupOrderId) filters.push(eq(orders.groupOrderId, opts.groupOrderId));
    return this.dbService.db
      .select()
      .from(orders)
      .where(and(...filters))
      .orderBy(desc(orders.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async getById(tailorId: string, id: string): Promise<OrderRow> {
    const rows = await this.dbService.db
      .select()
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Order ${id} not found`);
    return row;
  }

  /** Full detail: order + items + recent events (newest first). */
  async getDetail(tailorId: string, id: string): Promise<OrderDetail> {
    const order = await this.getById(tailorId, id);
    const [items, events] = await Promise.all([
      this.dbService.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id)),
      this.dbService.db
        .select()
        .from(orderEvents)
        .where(eq(orderEvents.orderId, id))
        .orderBy(desc(orderEvents.createdAt))
        .limit(100),
    ]);
    return { ...order, items, events };
  }

  async create(
    tailorId: string,
    actorUserId: string,
    data: OrderCreateInput,
  ): Promise<OrderRow> {
    await this.assertClientOwned(tailorId, data.clientId);

    const [created] = await this.dbService.db
      .insert(orders)
      .values({
        tailorId,
        clientId: data.clientId,
        groupOrderId: data.groupOrderId ?? null,
        groupOrderMemberId: data.groupOrderMemberId ?? null,
        orderName: data.orderName,
        dateOrdered: data.dateOrdered ? new Date(data.dateOrdered) : new Date(),
        dateDelivery: data.dateDelivery ? new Date(data.dateDelivery) : null,
        status: 'registered',
        notes: data.notes ?? null,
        totalAmount: data.totalAmount != null ? String(data.totalAmount) : null,
        currency: data.currency ?? null,
      })
      .returning();
    if (!created) throw new NotFoundException('Order insert returned no row');

    // Inline items (optional)
    if (data.items && data.items.length > 0) {
      await this.dbService.db.insert(orderItems).values(
        data.items.map((it) => ({
          orderId: created.id,
          garmentType: it.garmentType,
          measurements: it.measurements ?? null,
          notes: it.notes ?? null,
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice != null ? String(it.unitPrice) : null,
        })),
      );
    }

    // Audit event: order created
    await this.dbService.db.insert(orderEvents).values({
      orderId: created.id,
      actorUserId,
      eventType: 'created',
      fromStatus: null,
      toStatus: 'registered',
      payload: { orderName: created.orderName },
    });

    return created;
  }

  async update(
    tailorId: string,
    id: string,
    data: OrderUpdateInput,
  ): Promise<OrderRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
    if (data.groupOrderId !== undefined) patch.groupOrderId = data.groupOrderId;
    if (data.groupOrderMemberId !== undefined) patch.groupOrderMemberId = data.groupOrderMemberId;
    if (data.orderName !== undefined) patch.orderName = data.orderName;
    if (data.dateOrdered !== undefined) {
      patch.dateOrdered = data.dateOrdered ? new Date(data.dateOrdered) : new Date();
    }
    if (data.dateDelivery !== undefined) {
      patch.dateDelivery = data.dateDelivery ? new Date(data.dateDelivery) : null;
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.totalAmount !== undefined) {
      patch.totalAmount = data.totalAmount != null ? String(data.totalAmount) : null;
    }
    if (data.currency !== undefined) patch.currency = data.currency;

    const [row] = await this.dbService.db
      .update(orders)
      .set(patch)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, id)))
      .returning();
    if (!row) throw new NotFoundException(`Order ${id} not found`);
    return row;
  }

  /**
   * Status transition with server-side validation against the state machine
   * defined in @seamflow/schemas. Writes an append-only entry to order_events.
   */
  async transition(
    tailorId: string,
    actorUserId: string,
    id: string,
    data: OrderTransitionInput,
  ): Promise<OrderRow> {
    const current = await this.getById(tailorId, id);
    if (current.status === data.to) {
      return current; // no-op
    }
    if (!canTransitionOrderStatus(current.status, data.to)) {
      throw new ConflictException(
        `Cannot transition ${current.status} → ${data.to}`,
      );
    }

    const [row] = await this.dbService.db
      .update(orders)
      .set({ status: data.to, updatedAt: new Date() })
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, id)))
      .returning();
    if (!row) throw new NotFoundException(`Order ${id} not found`);

    await this.dbService.db.insert(orderEvents).values({
      orderId: id,
      actorUserId,
      eventType: 'status_change',
      fromStatus: current.status,
      toStatus: data.to,
      payload: data.note ? { note: data.note } : null,
    });

    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db
      .delete(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, id)));
  }
}
