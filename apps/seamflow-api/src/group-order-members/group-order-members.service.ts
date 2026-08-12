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
  measurementTemplates,
} from '../db/schema';
import type {
  CopyMemberMeasurementsInput,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  MeasurementCopyResult,
  MeasurementMatch,
  PromoteMemberToClientInput,
  SaveMemberMeasurementsInput,
} from '@seamflow/schemas';

export type GroupOrderMemberRow = typeof groupOrderMembers.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;

/**
 * The wire shape, but carrying a raw DB row for `member`.
 *
 * Drizzle hands back `Date` objects where the published schema declares ISO
 * strings; Nest serialises them on the way out, so the two agree at the
 * boundary even though they disagree in TypeScript. Every other method in this
 * service returns rows the same way — matching that beats hand-converting
 * timestamps here and diverging from the rest of the file.
 */
export type CopyMeasurementsResult = Omit<MeasurementCopyResult, 'member'> & {
  member: GroupOrderMemberRow;
};

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
        // NULL means inherit the group's garment — the normal case.
        garmentType: data.garmentType ?? null,
        templateId: data.templateId ?? null,
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
    if (data.garmentType !== undefined) patch.garmentType = data.garmentType;
    if (data.templateId !== undefined) patch.templateId = data.templateId;
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
   * The template this member is measured against: their own override if they
   * have one, otherwise the group order's.
   *
   * Returns the template's field keys, which is all the matching below needs.
   * An empty list means nothing was configured — a real state, and one the
   * caller has to report honestly rather than paper over.
   */
  private async resolveTemplate(
    member: GroupOrderMemberRow,
  ): Promise<{ templateId: string | null; fieldKeys: string[] }> {
    let templateId = member.templateId;

    if (!templateId) {
      const groupRows = await this.dbService.db
        .select({ templateId: groupOrders.templateId })
        .from(groupOrders)
        .where(eq(groupOrders.id, member.groupOrderId))
        .limit(1);
      templateId = groupRows[0]?.templateId ?? null;
    }
    if (!templateId) return { templateId: null, fieldKeys: [] };

    const tplRows = await this.dbService.db
      .select({ fields: measurementTemplates.fields })
      .from(measurementTemplates)
      .where(eq(measurementTemplates.id, templateId))
      .limit(1);

    const fields = (tplRows[0]?.fields ?? []) as { key?: string }[];
    const fieldKeys = fields.map((f) => f.key).filter((k): k is string => !!k);
    return { templateId, fieldKeys };
  }

  /**
   * Copy a client's saved measurements onto a group member.
   *
   * WHAT THIS USED TO DO, and why it was a bug worth a rewrite: it ran
   * `order by created_at desc limit 1` and copied whatever came back. No
   * check that the set had anything to do with the garment. A client whose
   * newest set was for trousers would have those numbers loaded into a gown
   * order, and the app reported "Copied!" in green. Silent and confident is
   * the worst combination — the tailor had no reason to look.
   *
   * The rule now is the same one the new-order wizard already uses:
   *
   *   1. a set built from the very template this member is measured against
   *   2. otherwise the set covering most of that template's fields
   *   3. otherwise, with no template configured, the newest set — but SAID SO
   *
   * The return value carries which set was used and how well it fit, so the
   * app can tell the truth instead of implying a match that was never checked.
   */
  async copyMeasurementsFromClient(
    tailorId: string,
    memberId: string,
    input: CopyMemberMeasurementsInput = {},
  ): Promise<CopyMeasurementsResult> {
    const member = await this.getById(tailorId, memberId);
    if (!member.clientId) {
      throw new BadRequestException(
        'Member has no linked client — set clientId first or use promote-to-client',
      );
    }

    const sets = await this.dbService.db
      .select({
        id: measurementSets.id,
        label: measurementSets.label,
        templateId: measurementSets.templateId,
        values: measurementSets.values,
      })
      .from(measurementSets)
      .where(eq(measurementSets.clientId, member.clientId))
      .orderBy(desc(measurementSets.createdAt));

    const { templateId, fieldKeys } = await this.resolveTemplate(member);

    const countMatches = (values: unknown): number => {
      if (!fieldKeys.length) return 0;
      const v = (values ?? {}) as Record<string, unknown>;
      return fieldKeys.filter((k) => v[k] !== undefined && v[k] !== null).length;
    };

    let chosen: (typeof sets)[number] | undefined;
    let match: MeasurementMatch = 'none';

    if (input.setId) {
      // Explicit pick by the tailor. Their judgement beats the heuristic, but
      // it still gets scored so the response says how much of the sheet it fills.
      chosen = sets.find((set) => set.id === input.setId);
      if (!chosen) throw new NotFoundException(`Measurement set ${input.setId} not found`);
      match = chosen.templateId && chosen.templateId === templateId ? 'template' : 'overlap';
    } else if (!templateId) {
      // No garment configured anywhere. Fall back to newest — the old
      // behaviour — but label it so the app can say the pick was untargeted
      // rather than pretend it was a match.
      chosen = sets[0];
      match = chosen ? 'untargeted' : 'none';
    } else {
      chosen = sets.find((set) => set.templateId === templateId);
      if (chosen) {
        match = 'template';
      } else {
        // Best overlap wins; `sets` is newest-first, so ties break toward the
        // most recent measuring, which is the one likelier to still be true.
        let best = 0;
        for (const set of sets) {
          const score = countMatches(set.values);
          if (score > best) {
            best = score;
            chosen = set;
          }
        }
        match = best > 0 ? 'overlap' : 'none';
        if (!best) chosen = undefined;
      }
    }

    // Nothing usable. Leave the member's existing measurements ALONE — the old
    // code wrote `{}` here, so a failed copy would wipe numbers the tailor had
    // already typed by hand.
    if (!chosen) {
      return {
        member,
        sourceSetId: null,
        sourceSetLabel: null,
        match: 'none',
        matchedFields: 0,
        targetFields: fieldKeys.length,
      };
    }

    const updated = await this.dbService.db
      .update(groupOrderMembers)
      .set({ measurements: chosen.values, updatedAt: new Date() })
      .where(eq(groupOrderMembers.id, memberId))
      .returning();
    const row = updated[0];
    if (!row) throw new NotFoundException(`Member ${memberId} not found`);

    return {
      member: row,
      sourceSetId: chosen.id,
      sourceSetLabel: chosen.label,
      match,
      matchedFields: countMatches(chosen.values),
      targetFields: fieldKeys.length,
    };
  }

  /**
   * Push a member's measurements back onto their client record.
   *
   * The opposite direction, and an explicit action rather than an automatic
   * sync. Measurements taken for one event are a snapshot: a bridesmaid
   * measured in a corseted gown should not have those numbers become her
   * general record for next year's trousers. The tailor decides when a
   * measuring session was good enough to keep.
   */
  async saveMeasurementsToClient(
    tailorId: string,
    memberId: string,
    input: SaveMemberMeasurementsInput = {},
  ): Promise<{ member: GroupOrderMemberRow; measurementSetId: string }> {
    const member = await this.getById(tailorId, memberId);
    if (!member.clientId) {
      throw new BadRequestException(
        'Member has no linked client — promote them to a client first',
      );
    }

    const values = (member.measurements ?? {}) as Record<string, unknown>;
    if (!Object.keys(values).length) {
      throw new BadRequestException('This member has no measurements to save');
    }

    const { templateId } = await this.resolveTemplate(member);

    let label = input.label?.trim() || member.garmentType?.trim() || null;
    if (!label) {
      const groupRows = await this.dbService.db
        .select({ name: groupOrders.name, garmentType: groupOrders.garmentType })
        .from(groupOrders)
        .where(eq(groupOrders.id, member.groupOrderId))
        .limit(1);
      label = groupRows[0]?.garmentType?.trim() || groupRows[0]?.name || 'Group order';
    }

    const inserted = await this.dbService.db
      .insert(measurementSets)
      .values({
        clientId: member.clientId,
        label,
        templateId,
        values: values as never,
      })
      .returning({ id: measurementSets.id });

    const setId = inserted[0]?.id;
    if (!setId) throw new NotFoundException('Measurement set insert returned no row');

    return { member, measurementSetId: setId };
  }
}
