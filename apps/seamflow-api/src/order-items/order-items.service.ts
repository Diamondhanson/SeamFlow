import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { orderItems, orders } from '../db/schema';
import type {
  OrderItemCreateInput,
  OrderItemUpdateInput,
} from '@seamflow/schemas';

export type OrderItemRow = typeof orderItems.$inferSelect;

@Injectable()
export class OrderItemsService {
  constructor(private readonly dbService: DbService) {}

  /** Verify the order belongs to this tailor. */
  private async assertOrderOwned(tailorId: string, orderId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.tailorId, tailorId), eq(orders.id, orderId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Order ${orderId} not found`);
  }

  async listForOrder(tailorId: string, orderId: string): Promise<OrderItemRow[]> {
    await this.assertOrderOwned(tailorId, orderId);
    return this.dbService.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id));
  }

  async getById(tailorId: string, id: string): Promise<OrderItemRow> {
    const rows = await this.dbService.db
      .select({ item: orderItems, orderTailorId: orders.tailorId })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orderItems.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.orderTailorId !== tailorId) {
      throw new NotFoundException(`Order item ${id} not found`);
    }
    return row.item;
  }

  async createForOrder(
    tailorId: string,
    orderId: string,
    data: OrderItemCreateInput,
  ): Promise<OrderItemRow> {
    await this.assertOrderOwned(tailorId, orderId);
    const [row] = await this.dbService.db
      .insert(orderItems)
      .values({
        orderId,
        garmentType: data.garmentType,
        measurements: data.measurements ?? null,
        notes: data.notes ?? null,
        quantity: data.quantity ?? 1,
        unitPrice: data.unitPrice != null ? String(data.unitPrice) : null,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: OrderItemUpdateInput,
  ): Promise<OrderItemRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof orderItems.$inferInsert> = {};
    if (data.garmentType !== undefined) patch.garmentType = data.garmentType;
    if (data.measurements !== undefined) patch.measurements = data.measurements;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.quantity !== undefined) patch.quantity = data.quantity;
    if (data.unitPrice !== undefined) {
      patch.unitPrice = data.unitPrice != null ? String(data.unitPrice) : null;
    }

    const [row] = await this.dbService.db
      .update(orderItems)
      .set(patch)
      .where(eq(orderItems.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Order item ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db.delete(orderItems).where(eq(orderItems.id, id));
  }
}
