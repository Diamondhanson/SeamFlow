import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { measurementTemplates } from '../db/schema';
import type {
  MeasurementTemplateCreateInput,
  MeasurementTemplateUpdateInput,
  TemplateField,
} from '@seamflow/schemas';

export type MeasurementTemplateRow = typeof measurementTemplates.$inferSelect;

@Injectable()
export class MeasurementTemplatesService {
  constructor(private readonly dbService: DbService) {}

  async list(tailorId: string): Promise<MeasurementTemplateRow[]> {
    return this.dbService.db
      .select()
      .from(measurementTemplates)
      .where(eq(measurementTemplates.tailorId, tailorId))
      .orderBy(desc(measurementTemplates.createdAt));
  }

  async getById(tailorId: string, id: string): Promise<MeasurementTemplateRow> {
    const rows = await this.dbService.db
      .select()
      .from(measurementTemplates)
      .where(
        and(
          eq(measurementTemplates.tailorId, tailorId),
          eq(measurementTemplates.id, id),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException(`Template ${id} not found`);
    return row;
  }

  async create(
    tailorId: string,
    data: MeasurementTemplateCreateInput,
  ): Promise<MeasurementTemplateRow> {
    const rows = await this.dbService.db
      .insert(measurementTemplates)
      .values({
        tailorId,
        name: data.name,
        garmentType: data.garmentType ?? null,
        description: data.description ?? null,
        fields: (data.fields ?? []) as TemplateField[],
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Insert returned no row');
    return row;
  }

  async update(
    tailorId: string,
    id: string,
    data: MeasurementTemplateUpdateInput,
  ): Promise<MeasurementTemplateRow> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof measurementTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.garmentType !== undefined) patch.garmentType = data.garmentType;
    if (data.description !== undefined) patch.description = data.description;
    if (data.fields !== undefined) patch.fields = data.fields as TemplateField[];

    const rows = await this.dbService.db
      .update(measurementTemplates)
      .set(patch)
      .where(
        and(
          eq(measurementTemplates.tailorId, tailorId),
          eq(measurementTemplates.id, id),
        ),
      )
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Template ${id} not found`);
    return row;
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db
      .delete(measurementTemplates)
      .where(
        and(
          eq(measurementTemplates.tailorId, tailorId),
          eq(measurementTemplates.id, id),
        ),
      );
  }
}
