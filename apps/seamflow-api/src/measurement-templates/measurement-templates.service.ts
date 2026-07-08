import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { measurementTemplates } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  MeasurementTemplateCreateInput,
  MeasurementTemplateUpdateInput,
  TemplateField,
  TemplateImage,
  TemplateImageInput,
} from '@seamflow/schemas';

// Template reference images live in the same private `designs` bucket, under
// `<tailorId>/templates/<uuid>`. The bucket RLS gates on the first path
// segment (= tailor id), so no separate bucket is needed.
const BUCKET = 'designs';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type MeasurementTemplateRow = typeof measurementTemplates.$inferSelect;
/** A row with its images resolved to short-lived signed URLs. */
export type MeasurementTemplateWithImages = Omit<MeasurementTemplateRow, 'images'> & {
  images: TemplateImage[];
};

@Injectable()
export class MeasurementTemplatesService {
  private readonly logger = new Logger(MeasurementTemplatesService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  async list(tailorId: string): Promise<MeasurementTemplateWithImages[]> {
    const rows = await this.dbService.db
      .select()
      .from(measurementTemplates)
      .where(eq(measurementTemplates.tailorId, tailorId))
      .orderBy(desc(measurementTemplates.createdAt));
    return Promise.all(rows.map((r) => this.withImageUrls(r)));
  }

  async getById(
    tailorId: string,
    id: string,
  ): Promise<MeasurementTemplateWithImages> {
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
    return this.withImageUrls(row);
  }

  async create(
    tailorId: string,
    data: MeasurementTemplateCreateInput,
  ): Promise<MeasurementTemplateWithImages> {
    const images = this.sanitizeImages(tailorId, data.images);
    const rows = await this.dbService.db
      .insert(measurementTemplates)
      .values({
        tailorId,
        name: data.name,
        garmentType: data.garmentType ?? null,
        description: data.description ?? null,
        fields: (data.fields ?? []) as TemplateField[],
        images,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Insert returned no row');
    return this.withImageUrls(row);
  }

  async update(
    tailorId: string,
    id: string,
    data: MeasurementTemplateUpdateInput,
  ): Promise<MeasurementTemplateWithImages> {
    await this.getById(tailorId, id);

    const patch: Partial<typeof measurementTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.garmentType !== undefined) patch.garmentType = data.garmentType;
    if (data.description !== undefined) patch.description = data.description;
    if (data.fields !== undefined) patch.fields = data.fields as TemplateField[];
    if (data.images !== undefined) {
      patch.images = this.sanitizeImages(tailorId, data.images);
    }

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
    return this.withImageUrls(row);
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

  // --------------------------------------------------------------------------

  /**
   * Keep only the stored fields (drop any signedUrl/thumbnailUrl a client may
   * echo back) and verify every image path belongs to this tailor.
   */
  private sanitizeImages(
    tailorId: string,
    images: TemplateImageInput[] | undefined,
  ): TemplateImageInput[] {
    return (images ?? []).map((img) => {
      this.assertPathOwnedByTailor(tailorId, img.storagePath);
      if (img.thumbnailPath) this.assertPathOwnedByTailor(tailorId, img.thumbnailPath);
      return {
        id: img.id,
        storagePath: img.storagePath,
        thumbnailPath: img.thumbnailPath ?? null,
        contentType: img.contentType ?? null,
      };
    });
  }

  private assertPathOwnedByTailor(tailorId: string, storagePath: string): void {
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException(
        `storagePath must start with the tailor's id (${tailorId}/...)`,
      );
    }
  }

  /** Resolve each stored image to short-lived signed URLs for full + thumb. */
  private async withImageUrls(
    row: MeasurementTemplateRow,
  ): Promise<MeasurementTemplateWithImages> {
    const stored = (row.images ?? []) as TemplateImageInput[];
    const images = await Promise.all(
      stored.map(async (img): Promise<TemplateImage> => {
        const [fullRes, thumbRes] = await Promise.all([
          this.supabase
            .admin()
            .storage.from(BUCKET)
            .createSignedUrl(img.storagePath, SIGNED_URL_TTL_SECONDS),
          img.thumbnailPath
            ? this.supabase
                .admin()
                .storage.from(BUCKET)
                .createSignedUrl(img.thumbnailPath, SIGNED_URL_TTL_SECONDS)
            : Promise.resolve(null),
        ]);
        const out: TemplateImage = { ...img };
        if (fullRes.data?.signedUrl) out.signedUrl = fullRes.data.signedUrl;
        else if (fullRes.error)
          this.logger.warn(
            `Signed URL failed for ${img.storagePath}: ${fullRes.error.message}`,
          );
        if (thumbRes?.data?.signedUrl) out.thumbnailUrl = thumbRes.data.signedUrl;
        return out;
      }),
    );
    return { ...row, images };
  }
}
