import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { notificationPreferences } from '../db/schema';
import type { NotificationPreferencesUpdateInput } from '@seamflow/schemas';

export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect;

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly dbService: DbService) {}

  /** Get the tailor's preferences, creating a default row on first access. */
  async getOrCreate(tailorId: string): Promise<NotificationPreferencesRow> {
    const rows = await this.dbService.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.tailorId, tailorId))
      .limit(1);
    if (rows[0]) return rows[0];

    const inserted = await this.dbService.db
      .insert(notificationPreferences)
      .values({ tailorId })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return inserted[0];

    // Lost an insert race — read the row the other writer created.
    const again = await this.dbService.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.tailorId, tailorId))
      .limit(1);
    return again[0];
  }

  async update(
    tailorId: string,
    data: NotificationPreferencesUpdateInput,
  ): Promise<NotificationPreferencesRow> {
    await this.getOrCreate(tailorId);

    const patch: Partial<typeof notificationPreferences.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.dueRemindersEnabled !== undefined)
      patch.dueRemindersEnabled = data.dueRemindersEnabled;
    if (data.leadDays !== undefined) {
      // De-dup + sort descending so reminders read 7 → 3 → 1 → 0.
      patch.leadDays = [...new Set(data.leadDays)].sort((a, b) => b - a);
    }
    if (data.overdueEnabled !== undefined) patch.overdueEnabled = data.overdueEnabled;
    if (data.statusChangeEnabled !== undefined)
      patch.statusChangeEnabled = data.statusChangeEnabled;
    if (data.reminderHour !== undefined) patch.reminderHour = data.reminderHour;
    if (data.timezone !== undefined) patch.timezone = data.timezone;
    if (data.language !== undefined) patch.language = data.language;

    const [row] = await this.dbService.db
      .update(notificationPreferences)
      .set(patch)
      .where(eq(notificationPreferences.tailorId, tailorId))
      .returning();
    return row;
  }
}
