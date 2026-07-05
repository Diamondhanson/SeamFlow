import { z } from 'zod';

// ============================================================================
// Notification preferences — one row per tailor. Controls order-due reminders
// (whether, how close to due, at what local hour), the overdue reminder, and
// the existing status-change push. `language` is persisted so the server can
// localize push copy (push is sent server-side, away from the app's t()).
// ============================================================================

export const NotificationPreferencesSchema = z.object({
  tailorId: z.string().uuid(),
  dueRemindersEnabled: z.boolean(),
  /** Days-before-due reminder points, e.g. [3] (default) or [7, 3, 1, 0]. */
  leadDays: z.array(z.number().int().min(0).max(60)),
  overdueEnabled: z.boolean(),
  statusChangeEnabled: z.boolean(),
  /** Local hour (0–23) reminders are sent around. */
  reminderHour: z.number().int().min(0).max(23),
  /** IANA timezone (e.g. 'Africa/Douala'); null → derive from country. */
  timezone: z.string().nullable(),
  /** UI language for localized push copy. */
  language: z.string(),
  updatedAt: z.string().datetime(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

/** Body for PATCH /me/notification-preferences. All fields optional. */
export const NotificationPreferencesUpdateSchema = z.object({
  dueRemindersEnabled: z.boolean().optional(),
  leadDays: z.array(z.number().int().min(0).max(60)).max(8).optional(),
  overdueEnabled: z.boolean().optional(),
  statusChangeEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().min(1).nullable().optional(),
  language: z.string().min(2).max(8).optional(),
});
export type NotificationPreferencesUpdateInput = z.infer<
  typeof NotificationPreferencesUpdateSchema
>;
