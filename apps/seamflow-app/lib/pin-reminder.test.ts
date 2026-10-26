import { PIN_REMINDER_INTERVAL_MS as WEEK, pinReminderKey, shouldRemindAboutPin } from './pin-reminder';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const base = { now: NOW, lastShownAt: null, pinSet: false, shopComplete: true };

describe('shouldRemindAboutPin', () => {
  it('asks straight away the first time, once the shop is set up', () => {
    expect(shouldRemindAboutPin(base)).toBe(true);
  });

  it('never asks once a PIN exists', () => {
    expect(shouldRemindAboutPin({ ...base, pinSet: true })).toBe(false);
    expect(shouldRemindAboutPin({ ...base, pinSet: true, lastShownAt: NOW - 10 * WEEK })).toBe(false);
  });

  it('does not ask before the shop is set up', () => {
    expect(shouldRemindAboutPin({ ...base, shopComplete: false })).toBe(false);
  });

  it('waits a full week between asks', () => {
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - 1000 })).toBe(false);
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - (WEEK - 1) })).toBe(false);
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - WEEK })).toBe(true);
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - 30 * 24 * 3600 * 1000 })).toBe(true);
  });

  it('is not silenced by a clock set back past the last ask', () => {
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW + 3 * WEEK })).toBe(true);
  });

  it('treats an unreadable stamp as never asked', () => {
    expect(shouldRemindAboutPin({ ...base, lastShownAt: Number.NaN })).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - 5000, intervalMs: 4000 })).toBe(true);
    expect(shouldRemindAboutPin({ ...base, lastShownAt: NOW - 5000, intervalMs: 6000 })).toBe(false);
  });
});

describe('pinReminderKey', () => {
  it('is separate per account', () => {
    expect(pinReminderKey('a')).not.toBe(pinReminderKey('b'));
  });
});
