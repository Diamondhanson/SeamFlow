import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  notificationPreferences,
  orderReminderLog,
  orders,
  tailors,
} from '../db/schema';
import { NotificationsService } from './notifications.service';
import { reminderMessage } from './reminder-templates';
import {
  daysUntilInTimezone,
  hourInTimezone,
  resolveTimezone,
} from './timezones';

// Defaults applied to tailors who have never opened notification settings
// (no preferences row yet).
const DEFAULTS = {
  dueRemindersEnabled: true,
  leadDays: [3] as number[],
  overdueEnabled: true,
  reminderHour: 8,
  language: 'en',
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Runs at the top of every hour. For each tailor whose *local* time matches
   * their chosen reminder hour, scan open orders and send any due/overdue
   * reminders they haven't been sent yet.
   */
  @Cron('0 * * * *')
  async runDueReminders(now = new Date()): Promise<void> {
    if (!this.dbService.db) return;

    const rows = await this.dbService.db
      .select({
        tailorId: tailors.id,
        userId: tailors.userId,
        country: tailors.countryCode,
        dueEnabled: notificationPreferences.dueRemindersEnabled,
        leadDays: notificationPreferences.leadDays,
        overdueEnabled: notificationPreferences.overdueEnabled,
        reminderHour: notificationPreferences.reminderHour,
        timezone: notificationPreferences.timezone,
        language: notificationPreferences.language,
      })
      .from(tailors)
      .leftJoin(
        notificationPreferences,
        eq(notificationPreferences.tailorId, tailors.id),
      );

    for (const r of rows) {
      const dueEnabled = r.dueEnabled ?? DEFAULTS.dueRemindersEnabled;
      const overdueEnabled = r.overdueEnabled ?? DEFAULTS.overdueEnabled;
      if (!dueEnabled && !overdueEnabled) continue;

      const tz = resolveTimezone(r.timezone, r.country);
      const reminderHour = r.reminderHour ?? DEFAULTS.reminderHour;
      if (hourInTimezone(tz, now) !== reminderHour) continue;

      await this.scanTailor(r.tailorId, r.userId, tz, now, {
        dueEnabled,
        overdueEnabled,
        leadDays: r.leadDays ?? DEFAULTS.leadDays,
        language: r.language ?? DEFAULTS.language,
      }).catch((e) =>
        this.logger.error(`Reminder scan failed for ${r.tailorId}: ${e}`),
      );
    }
  }

  private async scanTailor(
    tailorId: string,
    userId: string,
    tz: string,
    now: Date,
    opts: {
      dueEnabled: boolean;
      overdueEnabled: boolean;
      leadDays: number[];
      language: string;
    },
  ): Promise<void> {
    const open = await this.dbService.db
      .select({
        id: orders.id,
        name: orders.orderName,
        delivery: orders.dateDelivery,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tailorId, tailorId),
          ne(orders.status, 'delivered'),
          isNotNull(orders.dateDelivery),
        ),
      );

    for (const o of open) {
      if (!o.delivery) continue;
      const d = daysUntilInTimezone(o.delivery, tz, now);

      if (opts.dueEnabled) {
        for (const lead of opts.leadDays) {
          if (d !== lead) continue;
          if (!(await this.claim(o.id, `lead_${lead}`))) continue;
          const msg = reminderMessage(
            lead === 0 ? 'dueToday' : 'dueInDays',
            opts.language,
            { order: o.name, n: lead },
          );
          this.notifications.fireAndForget(userId, {
            ...msg,
            data: { type: 'order_due', orderId: o.id },
          });
        }
      }

      if (opts.overdueEnabled && d < 0) {
        if (await this.claim(o.id, 'overdue')) {
          const msg = reminderMessage('overdue', opts.language, {
            order: o.name,
          });
          this.notifications.fireAndForget(userId, {
            ...msg,
            data: { type: 'order_due', orderId: o.id },
          });
        }
      }
    }
  }

  /**
   * Atomically reserve a (order, bucket) reminder. Returns true only for the
   * writer that inserted the row, so a reminder is sent at most once even if
   * two cron ticks overlap.
   */
  private async claim(orderId: string, bucket: string): Promise<boolean> {
    const inserted = await this.dbService.db
      .insert(orderReminderLog)
      .values({ orderId, bucket })
      .onConflictDoNothing()
      .returning({ id: orderReminderLog.id });
    return inserted.length > 0;
  }
}
