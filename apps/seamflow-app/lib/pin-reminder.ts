// ============================================================================
// When to nudge a designer to set a PIN.
//
// A designer's phone holds their clients' names and measurements, their orders
// and their invoices. The PIN is optional and most people never find it, so the
// app asks — but a question asked on every launch gets tapped away without being
// read, so it is asked rarely.
//
// The rules, in one place so they can be tested without a phone:
//   - never once a PIN exists: the job is done, stop asking;
//   - only for a shop that is actually set up (lib/shop-setup): someone still
//     filling in their profile has bigger things to do, and "protect your shop"
//     means little before there is one;
//   - the first time as soon as both are true, then at most once a week.
//
// The timestamp is written when the question is ASKED, not when it is answered.
// Otherwise force-quitting with the dialog open would ask again on the very next
// launch, which is the one thing this is meant to avoid.
// ============================================================================

export const PIN_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Per account, so two people sharing a phone each get their own schedule. */
export const pinReminderKey = (userId: string): string => `seamflow.pinReminder.v1.${userId}`;

export function shouldRemindAboutPin(input: {
  now: number;
  /** When it was last asked, or null if never (or unreadable). */
  lastShownAt: number | null;
  pinSet: boolean;
  shopComplete: boolean;
  intervalMs?: number;
}): boolean {
  const { now, lastShownAt, pinSet, shopComplete, intervalMs = PIN_REMINDER_INTERVAL_MS } = input;
  if (pinSet || !shopComplete) return false;
  if (lastShownAt === null || !Number.isFinite(lastShownAt)) return true;
  const elapsed = now - lastShownAt;
  // A negative gap means the phone's clock was set back past the last ask. Treat
  // it as stale rather than silencing the reminder until the clock catches up;
  // asking updates the stamp, so this can only happen once.
  if (elapsed < 0) return true;
  return elapsed >= intervalMs;
}
