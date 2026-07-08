import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { fabrics } from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  FabricCreateInput,
  FabricResponse,
  FabricUpdateInput,
  OrderFabric,
} from '@seamflow/schemas';

// Swatch photos live in the same private `designs` bucket, under
// `<tailorId>/fabrics/<uuid>`. The bucket RLS gates on the first path segment
// (= tailor id), so no separate bucket is needed.
const BUCKET = 'designs';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type FabricRow = typeof fabrics.$inferSelect;

@Injectable()
export class FabricsService {
  private readonly logger = new Logger(FabricsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  async list(tailorId: string): Promise<FabricResponse[]> {
    const rows = await this.dbService.db
      .select()
      .from(fabrics)
      .where(eq(fabrics.tailorId, tailorId))
      .orderBy(desc(fabrics.createdAt));
    return Promise.all(rows.map((r) => this.withPhotoUrls(r)));
  }

  async getById(tailorId: string, id: string): Promise<FabricResponse> {
    const row = await this.findRaw(tailorId, id);
    if (!row) throw new NotFoundException(`Fabric ${id} not found`);
    return this.withPhotoUrls(row);
  }

  async create(tailorId: string, data: FabricCreateInput): Promise<FabricResponse> {
    this.assertPhotoOwnership(tailorId, data);
    const rows = await this.dbService.db
      .insert(fabrics)
      .values({
        tailorId,
        name: data.name,
        supplier: data.supplier ?? null,
        color: data.color ?? null,
        composition: data.composition ?? null,
        yardageMeters: data.yardageMeters ?? null,
        costPerMeter: data.costPerMeter ?? null,
        photoKey: data.photoKey ?? null,
        photoThumbKey: data.photoThumbKey ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException('Insert returned no row');
    return this.withPhotoUrls(row);
  }

  async update(
    tailorId: string,
    id: string,
    data: FabricUpdateInput,
  ): Promise<FabricResponse> {
    await this.getById(tailorId, id);
    this.assertPhotoOwnership(tailorId, data);

    const patch: Partial<typeof fabrics.$inferInsert> = { updatedAt: new Date() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.supplier !== undefined) patch.supplier = data.supplier;
    if (data.color !== undefined) patch.color = data.color;
    if (data.composition !== undefined) patch.composition = data.composition;
    if (data.yardageMeters !== undefined) patch.yardageMeters = data.yardageMeters;
    if (data.costPerMeter !== undefined) patch.costPerMeter = data.costPerMeter;
    if (data.photoKey !== undefined) patch.photoKey = data.photoKey;
    if (data.photoThumbKey !== undefined) patch.photoThumbKey = data.photoThumbKey;

    const rows = await this.dbService.db
      .update(fabrics)
      .set(patch)
      .where(and(eq(fabrics.tailorId, tailorId), eq(fabrics.id, id)))
      .returning();
    const row = rows[0];
    if (!row) throw new NotFoundException(`Fabric ${id} not found`);
    return this.withPhotoUrls(row);
  }

  async delete(tailorId: string, id: string): Promise<void> {
    await this.getById(tailorId, id);
    await this.dbService.db
      .delete(fabrics)
      .where(and(eq(fabrics.tailorId, tailorId), eq(fabrics.id, id)));
  }

  // --------------------------------------------------------------------------
  // Cross-module helpers (orders, invoices, share-links)
  // --------------------------------------------------------------------------

  /** Tailor-scoped raw fetch — returns the row or null (no signed URLs). */
  async findRaw(tailorId: string, id: string): Promise<FabricRow | null> {
    const rows = await this.dbService.db
      .select()
      .from(fabrics)
      .where(and(eq(fabrics.tailorId, tailorId), eq(fabrics.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Fetch by id alone — for callers that already tenant-checked the order. */
  async findByIdRaw(id: string): Promise<FabricRow | null> {
    const rows = await this.dbService.db
      .select()
      .from(fabrics)
      .where(eq(fabrics.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Compact client-facing shape with a signed swatch URL (thumb, then full). */
  async toOrderFabric(row: FabricRow): Promise<OrderFabric> {
    const key = row.photoThumbKey ?? row.photoKey;
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      photoUrl: key ? await this.signUrl(key) : null,
    };
  }

  // --------------------------------------------------------------------------

  private assertPhotoOwnership(
    tailorId: string,
    data: { photoKey?: string | null; photoThumbKey?: string | null },
  ): void {
    if (data.photoKey) this.assertPathOwnedByTailor(tailorId, data.photoKey);
    if (data.photoThumbKey)
      this.assertPathOwnedByTailor(tailorId, data.photoThumbKey);
  }

  private assertPathOwnedByTailor(tailorId: string, storagePath: string): void {
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException(
        `photo key must start with the tailor's id (${tailorId}/...)`,
      );
    }
  }

  private async signUrl(key: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .admin()
      .storage.from(BUCKET)
      .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
    if (data?.signedUrl) return data.signedUrl;
    if (error) this.logger.warn(`Signed URL failed for ${key}: ${error.message}`);
    return null;
  }

  private async withPhotoUrls(row: FabricRow): Promise<FabricResponse> {
    const [photoUrl, photoThumbUrl] = await Promise.all([
      row.photoKey ? this.signUrl(row.photoKey) : Promise.resolve(null),
      row.photoThumbKey ? this.signUrl(row.photoThumbKey) : Promise.resolve(null),
    ]);
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      photoUrl,
      photoThumbUrl,
    };
  }
}
