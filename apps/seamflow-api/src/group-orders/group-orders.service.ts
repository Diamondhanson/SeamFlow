import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { clients, groupOrderMembers, groupOrders } from '../db/schema';
import type {
  GroupOrderCreateInput,
  GroupOrderStatus,
  GroupOrderUpdateInput,
  GroupOrderWithMembersCreateInput,
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
        ownerClientId: data.ownerClientId ?? null,
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

  /**
   * Atomic create — captures owner + members in a single transaction.
   *
   * Three things happen inside one DB transaction so the caller never sees a
   * partial tree:
   *   1. If `owner.newContact` was provided, create a new client row owned by
   *      this tailor and use its id as the group's ownerClientId.
   *      If `owner.existingClientId` was provided, verify it belongs to this
   *      tailor and use it directly.
   *   2. Insert the group order with the resolved ownerClientId.
   *   3. Bulk-insert any inline members, auto-assigning `position` if missing.
   *
   * Returns the full group + members payload (same shape as getWithMembers).
   */
  async createWithMembers(
    tailorId: string,
    data: GroupOrderWithMembersCreateInput,
  ): Promise<GroupOrderWithMembers> {
    return this.dbService.db.transaction(async (tx) => {
      // -------- 1. Resolve owner --------
      let ownerClientId: string;
      if ('existingClientId' in data.owner) {
        const [existing] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(
            and(
              eq(clients.id, data.owner.existingClientId),
              eq(clients.tailorId, tailorId),
            ),
          )
          .limit(1);
        if (!existing) {
          throw new NotFoundException(
            `Owner client ${data.owner.existingClientId} not found for this tailor`,
          );
        }
        ownerClientId = existing.id;
      } else {
        const [newClient] = await tx
          .insert(clients)
          .values({
            tailorId,
            fullName: data.owner.newContact.fullName,
            phone: data.owner.newContact.phone,
            address: data.owner.newContact.address,
          })
          .returning({ id: clients.id });
        if (!newClient) {
          throw new NotFoundException('Owner client insert returned no row');
        }
        ownerClientId = newClient.id;
      }

      // -------- 2. Insert group --------
      const [group] = await tx
        .insert(groupOrders)
        .values({
          tailorId,
          name: data.name,
          description: data.description ?? null,
          sharedDesignNotes: data.sharedDesignNotes ?? null,
          sharedFabricId: data.sharedFabricId ?? null,
          ownerClientId,
          eventDate: data.eventDate ? new Date(data.eventDate) : null,
          dateDelivery: data.dateDelivery ? new Date(data.dateDelivery) : null,
          status: 'planning',
        })
        .returning();
      if (!group) {
        throw new NotFoundException('Group order insert returned no row');
      }

      // -------- 3. Insert members (if any) --------
      let members: GroupOrderMemberRow[] = [];
      if (data.members.length > 0) {
        const values = data.members.map((m, i) => ({
          groupOrderId: group.id,
          fullName: m.fullName,
          roleLabel: m.roleLabel ?? null,
          notes: m.notes ?? null,
          // Caller-provided position wins; otherwise we use array order so the
          // displayed list matches the order they were typed.
          position: m.position ?? i,
        }));
        members = await tx.insert(groupOrderMembers).values(values).returning();
      }

      return { ...group, members };
    });
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
    if (data.ownerClientId !== undefined) patch.ownerClientId = data.ownerClientId;
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
