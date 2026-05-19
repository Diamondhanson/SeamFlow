import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { groupOrderMembers, groupOrders } from '../db/schema';
import type {
  GroupOrderCreateInput,
  GroupOrderStatus,
  GroupOrderUpdateInput,
} from '@seamflow/schemas';

export type GroupOrderRow = typeof groupOrders.$inferSelect;
export type GroupOrderMemberRow = typeof groupOrderMembers.$inferSelect;
export type GroupOrderWithMembers = GroupOrderRow & { members: GroupOrderMemberRow[] };

interface ListOptions {
  limit: number;
  offset: number;
  status?: GroupOrderStatus;
}

@Injectable()
export class GroupOrdersService {
  constructor(private readonly dbService: DbService) {}

  async list(tailorId: string, opts: ListOptions): Promise<GroupOrderRow[]> {
    const filters = [eq(groupOrders.tailorId, tailorId)];
    if (opts.status) filters.push(eq(groupOrders.status, opts.status));
    return this.dbService.db
      .select()
      .from(groupOrders)
      .where(and(...filters))
      .orderBy(desc(groupOrders.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async getById(tailorId: string, id: string): Promise<GroupOrderRow> {
    const rows = await this.dbService.db
      .select()
      .from(groupOrders)
      .where(and(eq(groupOrders.tailorId, tailorId), eq(groupOrders.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Group order ${id} not found`);
    return row;
  }

  async getWithMembers(tailorId: string, id: string): Promise<GroupOrderWithMembers> {
    const group = await this.getById(tailorId, id);
    const members = await this.dbService.db
      .select()
      .from(groupOrderMembers)
      .where(eq(groupOrderMembers.groupOrderId, id))
      .orderBy(asc(groupOrderMembers.position), asc(groupOrderMembers.createdAt));
    return { ...group, members };
  }

  async create(tailorId: string, data: GroupOrderCreateInput): Promise<GroupOrderRow> {
    const rows = await this.dbService.db
      .insert(groupOrders)
      .values({
        tailorId,
        name: data.name,
        description: data.description ?? null,
        sharedDesignNotes: data.sharedDesignNotes ?? null,
        sharedFabricId: data.sharedFabricId ?? null,
        ownerMemberId: data.ownerMemberId ?? null,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        dateDelivery: data.dateDelivery ? new Date(data.dateDelivery) : null,
        status: data.status ?? 'planning',
        totalAmount: data.totalAmount != null ? String(data.totalAmount) : null,
        currency: data.currency ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Group order insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: GroupOrderUpdateInput,
  ): Promise<GroupOrderRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof groupOrders.$inferInsert> = { updatedAt: new Date() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.sharedDesignNotes !== undefined) patch.sharedDesignNotes = data.sharedDesignNotes;
    if (data.sharedFabricId !== undefined) patch.sharedFabricId = data.sharedFabricId;
    if (data.ownerMemberId !== undefined) patch.ownerMemberId = data.ownerMemberId;
    if (data.eventDate !== undefined) {
      patch.eventDate = data.eventDate ? new Date(data.eventDate) : null;
    }
    if (data.dateDelivery !== undefined) {
      patch.dateDelivery = data.dateDelivery ? new Date(data.dateDelivery) : null;
    }
    if (data.status !== undefined) patch.status = data.status;
    if (data.totalAmount !== undefined) {
      patch.totalAmount = data.totalAmount != null ? String(data.totalAmount) : null;
    }
    if (data.currency !== undefined) patch.currency = data.currency;

    const rows = await this.dbService.db
      .update(groupOrders)
      .set(patch)
      .where(and(eq(groupOrders.tailorId, tailorId), eq(groupOrders.id, id)))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Group order ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db
      .delete(groupOrders)
      .where(and(eq(groupOrders.tailorId, tailorId), eq(groupOrders.id, id)));
  }
}
