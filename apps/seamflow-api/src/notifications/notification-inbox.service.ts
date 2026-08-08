import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type {
  Notification,
  NotificationPage,
  NotificationSettings,
  NotificationType,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { notificationSettings, notifications } from '../db/schema';

/**
 * Read side of the notification inbox. Writes go through
 * `NotificationsService.emit()` — see the note there about why there is exactly
 * one write path.
 */
@Injectable()
export class NotificationInboxService {
  constructor(private readonly dbService: DbService) {}

  /**
   * Newest-first page for one user.
   *
   * Keyset on `(created_at, id)` rather than OFFSET, matching chat and feed.
   * Offset paging on a table the user is actively adding to double-serves and
   * skips rows as new notifications arrive mid-scroll — exactly the situation
   * an inbox is in.
   */
  async list(
    userId: string,
    opts: { cursor?: string; limit: number },
  ): Promise<NotificationPage> {
    const db = this.dbService.db;

    const where = [eq(notifications.userId, userId)];
    if (opts.cursor) {
      const decoded = this.decodeCursor(opts.cursor);
      if (decoded) {
        where.push(
          or(
            lt(notifications.createdAt, decoded.createdAt),
            and(
              eq(notifications.createdAt, decoded.createdAt),
              lt(notifications.id, decoded.id),
            ),
          )!,
        );
      }
    }

    // Over-fetch by one to learn whether another page exists without a count.
    const rows = await db
      .select()
      .from(notifications)
      .where(and(...where))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const page = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((r) => this.toDto(r)),
      nextCursor:
        hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
      // Bundled with the page so the badge doesn't cost a second round trip.
      unreadCount: await this.unreadCount(userId),
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.count ?? 0;
  }

  /**
   * Mark ONE notification read.
   *
   * Scoped by userId as well as id — without it, any authenticated user could
   * mark someone else's notification read by guessing a uuid.
   */
  async markRead(userId: string, id: string): Promise<{ unreadCount: number }> {
    await this.dbService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );
    return { unreadCount: await this.unreadCount(userId) };
  }

  /**
   * Explicit "mark all read".
   *
   * Deliberately a separate action rather than something the list endpoint does
   * as a side effect. If merely opening the screen cleared everything, the user
   * would lose the ability to come back to it — which is the entire reason the
   * inbox exists.
   */
  async markAllRead(userId: string): Promise<{ unreadCount: number }> {
    await this.dbService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { unreadCount: 0 };
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    const [row] = await this.dbService.db
      .select({ mutedTypes: notificationSettings.mutedTypes })
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    return { mutedTypes: (row?.mutedTypes ?? []) as NotificationType[] };
  }

  async updateSettings(
    userId: string,
    input: NotificationSettings,
  ): Promise<NotificationSettings> {
    await this.dbService.db
      .insert(notificationSettings)
      .values({ userId, mutedTypes: input.mutedTypes, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { mutedTypes: input.mutedTypes, updatedAt: new Date() },
      });
    return { mutedTypes: input.mutedTypes };
  }

  // ── cursor helpers ─────────────────────────────────────────────────────────

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
    try {
      const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
      if (!iso || !id) return null;
      const createdAt = new Date(iso);
      return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
    } catch {
      // A malformed cursor means "start from the top", not a 500.
      return null;
    }
  }

  private toDto(r: typeof notifications.$inferSelect): Notification {
    return {
      id: r.id,
      type: r.type as Notification['type'],
      params: (r.params ?? {}) as Notification['params'],
      entityType: r.entityType as Notification['entityType'],
      entityId: r.entityId,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
