import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  clients,
  groupOrderMembers,
  groupOrders,
  measurementSets,
} from '../db/schema';
import type {
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  PromoteMemberToClientInput,
} from '@seamflow/schemas';

export type GroupOrderMemberRow = typeof groupOrderMembers.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;

@Injectable()
export class GroupOrderMembersService {
  constructor(private readonly dbService: DbService) {}

  /** Verifies the group belongs to the tailor. Throws 404 otherwise. */
  private async assertGroupOwned(tailorId: string, groupOrderId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: groupOrders.id })
      .from(groupOrders)
      .where(and(eq(groupOrders.tailorId, tailorId), eq(groupOrders.id, groupOrderId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Group order ${groupOrderId} not found`);
  }

  /** Verifies the client belongs to the tailor. Throws 400 if mismatch. */
  private async assertClientOwned(tailorId: string, clientId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.tailorId, tailorId), eq(clients.id, clientId)))
      .limit(1);
    if (!rows[0]) {
      throw new BadRequestException(`Client ${clientId} does not belong to this tailor`);
    }
  }

  async listForGroup(
    tailorId: string,
    groupOrderId: string,
  ): Promise<GroupOrderMemberRow[]> {
    await this.assertGroupOwned(tailorId, groupOrderId);
    return this.dbService.db
      .select()
      .from(groupOrderMembers)
      .where(eq(groupOrderMembers.groupOrderId, groupOrderId))
      .orderBy(asc(groupOrderMembers.position), asc(groupOrderMembers.createdAt));
  }

  async getById(tailorId: string, id: string): Promise<GroupOrderMemberRow> {
    const rows = await this.dbService.db
      .select({
        member: groupOrderMembers,
        groupTailorId: groupOrders.tailorId,
      })
      .from(groupOrderMembers)
      .innerJoin(groupOrders, eq(groupOrders.id, groupOrderMembers.groupOrderId))
      .where(eq(groupOrderMembers.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.groupTailorId !== tailorId) {
      throw new NotFoundException(`Member ${id} not found`);
    }
    return row.member;
  }

  async createForGroup(
    tailorId: string,
    groupOrderId: string,
    data: GroupOrderMemberCreateInput,
  ): Promise<GroupOrderMemberRow> {
    await this.assertGroupOwned(tailorId, groupOrderId);
    if (data.clientId) await this.assertClientOwned(tailorId, data.clientId);

    const rows = await this.dbService.db
      .insert(groupOrderMembers)
      .values({
        groupOrderId,
        clientId: data.clientId ?? null,
        fullName: data.fullName,
        roleLabel: data.roleLabel ?? null,
        measurements: data.measurements ?? {},
        notes: data.notes ?? null,
        position: data.position ?? 0,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Member insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: GroupOrderMemberUpdateInput,
  ): Promise<GroupOrderMemberRow> {
    await this.getById(tailorId, id);
    if (data.clientId) await this.assertClientOwned(tailorId, data.clientId);

    const patch: Partial<typeof groupOrderMembers.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.fullName !== undefined) patch.fullName = data.fullName;
    if (data.clientId !== undefined) patch.clientId = data.clientId;
    if (data.roleLabel !== undefined) patch.roleLabel = data.roleLabel;
    if (data.measurements !== undefined) patch.measurements = data.measurements;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.position !== undefined) patch.position = data.position;

    const rows = await this.dbService.db
      .update(groupOrderMembers)
      .set(patch)
      .where(eq(groupOrderMembers.id, id))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Member ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db.delete(groupOrderMembers).where(eq(groupOrderMembers.id, id));
  }

  /**
   * Converts an ad-hoc member (no clientId) into a full client.
   * Creates a `clients` row from the member's fullName + the provided phone,
   * then links the member to it. Errors if the member is already linked.
   */
  async promoteToClient(
    tailorId: string,
    memberId: string,
    data: PromoteMemberToClientInput,
  ): Promise<{ member: GroupOrderMemberRow; client: ClientRow }> {
    const member = await this.getById(tailorId, memberId);
    if (member.clientId) {
      throw new ConflictException('Member is already linked to a client');
    }

    const clientRows = await this.dbService.db
      .insert(clients)
      .values({
        tailorId,
        fullName: member.fullName,
        phone: data.phone,
        email: data.email ?? null,
        notes: data.notes ?? null,
      })
      .returning();
    const client = clientRows[0];
    if (!client) throw new NotFoundException('Client insert returned no row');

    const memberRows = await this.dbService.db
      .update(groupOrderMembers)
      .set({ clientId: client.id, updatedAt: new Date() })
      .where(eq(groupOrderMembers.id, memberId))
      .returning();
    const updatedMember = memberRows[0];
    if (!updatedMember) throw new NotFoundException(`Member ${memberId} vanished`);

    return { member: updatedMember, client };
  }

  /**
   * Copies the linked client's most recent measurement_set.values into the
   * member's measurements jsonb. Member must already have a clientId.
   * If the client has no measurement set, the member's measurements are
   * cleared to `{}`.
   */
  async copyMeasurementsFromClient(
    tailorId: string,
    memberId: string,
  ): Promise<GroupOrderMemberRow> {
    const member = await this.getById(tailorId, memberId);
    if (!member.clientId) {
      throw new BadRequestException(
        'Member has no linked client — set clientId first or use promote-to-client',
      );
    }

    const setRows = await this.dbService.db
      .select({ values: measurementSets.values })
      .from(measurementSets)
      .where(eq(measurementSets.clientId, member.clientId))
      .orderBy(desc(measurementSets.createdAt))
      .limit(1);

    const values = setRows[0]?.values ?? {};

    const updated = await this.dbService.db
      .update(groupOrderMembers)
      .set({ measurements: values, updatedAt: new Date() })
      .where(eq(groupOrderMembers.id, memberId))
      .returning();
    const row = updated[0];
    if (!row) throw new NotFoundException(`Member ${memberId} not found`);
    return row;
  }
}
