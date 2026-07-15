import type { NotificationPreferences } from '@seamflow/schemas';

// Client-side defaults, mirroring the server's notification_preferences column
// defaults. Used so the Settings controls stay usable even when the preferences
// request hasn't loaded (or failed) — the UI shows sensible defaults and edits
// sync when the connection returns.
export function defaultNotificationPreferences(
  language = 'en',
): NotificationPreferences {
  return {
    tailorId: '',
    dueRemindersEnabled: true,
    leadDays: [3],
    overdueEnabled: true,
    statusChangeEnabled: true,
    reminderHour: 8,
    timezone: null,
    language,
    updatedAt: new Date().toISOString(),
  };
}
