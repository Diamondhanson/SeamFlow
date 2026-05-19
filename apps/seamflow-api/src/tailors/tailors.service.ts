import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { tailors } from '../db/schema';
import type { TailorUpsertInput } from '@seamflow/schemas';

export type TailorRow = typeof tailors.$inferSelect;

@Injectable()
export class TailorsService {
  constructor(private readonly dbService: DbService) {}

  async getForUser(userId: string): Promise<TailorRow | null> {
    const rows = await this.dbService.db
      .select()
      .from(tailors)
      .where(eq(tailors.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Idempotent: creates a tailor row for the user if missing, otherwise
   * updates the existing one. Returns the resulting row.
   */
  async upsertForUser(userId: string, data: TailorUpsertInput): Promise<TailorRow> {
    const payload = {
      userId,
      businessName: data.businessName,
      photoUrl: data.photoUrl ?? null,
      location: data.location ?? null,
      countryCode: data.countryCode,
      currency: data.currency,
    };

    const rows = await this.dbService.db
      .insert(tailors)
      .values(payload)
      .onConflictDoUpdate({
        target: tailors.userId,
        set: {
          businessName: payload.businessName,
          photoUrl: payload.photoUrl,
          location: payload.location,
          countryCode: payload.countryCode,
          currency: payload.currency,
          updatedAt: new Date(),
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Tailor upsert returned no row');
    }
    return row;
  }

  /** Returns the tailor id for the user, or throws 404. */
  async requireTailorId(userId: string): Promise<string> {
    const t = await this.getForUser(userId);
    if (!t) {
      throw new NotFoundException(
        'No tailor profile for this user — call POST /me/tailor first',
      );
    }
    return t.id;
  }
}
