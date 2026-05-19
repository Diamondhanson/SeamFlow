import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { clients, measurementSets } from '../db/schema';
import type {
  MeasurementSetCreateInput,
  MeasurementSetUpdateInput,
} from '@seamflow/schemas';

export type MeasurementSetRow = typeof measurementSets.$inferSelect;

@Injectable()
export class MeasurementSetsService {
  constructor(private readonly dbService: DbService) {}

  private async assertClientOwned(tailorId: string, clientId: string): Promise<void> {
    const rows = await this.dbService.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.tailorId, tailorId), eq(clients.id, clientId)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Client ${clientId} not found`);
  }

  async listForClient(
    tailorId: string,
    clientId: string,
  ): Promise<MeasurementSetRow[]> {
    await this.assertClientOwned(tailorId, clientId);
    return this.dbService.db
      .select()
      .from(measurementSets)
      .where(eq(measurementSets.clientId, clientId))
      .orderBy(desc(measurementSets.createdAt));
  }

  async getById(tailorId: string, id: string): Promise<MeasurementSetRow> {
    const rows = await this.dbService.db
      .select({
        set: measurementSets,
        clientTailorId: clients.tailorId,
      })
      .from(measurementSets)
      .innerJoin(clients, eq(clients.id, measurementSets.clientId))
      .where(eq(measurementSets.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.clientTailorId !== tailorId) {
      throw new NotFoundException(`Measurement set ${id} not found`);
    }
    return row.set;
  }

  async createForClient(
    tailorId: string,
    clientId: string,
    data: MeasurementSetCreateInput,
  ): Promise<MeasurementSetRow> {
    await this.assertClientOwned(tailorId, clientId);
    const rows = await this.dbService.db
      .insert(measurementSets)
      .values({
        clientId,
        templateId: data.templateId ?? null,
        label: data.label ?? 'default',
        values: data.values,
        unitPreference: data.unitPreference ?? 'cm',
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: MeasurementSetUpdateInput,
  ): Promise<MeasurementSetRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof measurementSets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.label !== undefined) patch.label = data.label;
    if (data.templateId !== undefined) patch.templateId = data.templateId;
    if (data.values !== undefined) patch.values = data.values;
    if (data.unitPreference !== undefined) patch.unitPreference = data.unitPreference;

    const rows = await this.dbService.db
      .update(measurementSets)
      .set(patch)
      .where(eq(measurementSets.id, id))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Measurement set ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db.delete(measurementSets).where(eq(measurementSets.id, id));
  }
}
