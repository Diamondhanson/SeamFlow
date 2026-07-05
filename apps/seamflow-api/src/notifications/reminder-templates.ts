// Localized push copy for order reminders. Push is sent server-side, so this
// does NOT use the app's t(); it's a small parallel dictionary. Keep the keys
// in sync with the languages the app supports.

type Lang = 'en' | 'fr';

interface Vars {
  order: string;
  n?: number; // days until due, for the lead reminders
}

const COPY = {
  en: {
    dueInDays: (v: Vars) =>
      `${v.order} is due in ${v.n} day${v.n === 1 ? '' : 's'}`,
    dueToday: (v: Vars) => `${v.order} is due today`,
    overdue: (v: Vars) => `${v.order} is overdue`,
  },
  fr: {
    dueInDays: (v: Vars) =>
      `${v.order} est à livrer dans ${v.n} jour${v.n && v.n > 1 ? 's' : ''}`,
    dueToday: (v: Vars) => `${v.order} est à livrer aujourd'hui`,
    overdue: (v: Vars) => `${v.order} est en retard`,
  },
} as const;

export type ReminderKind = 'dueInDays' | 'dueToday' | 'overdue';

/** Build the localized { title, body } for a reminder push. */
export function reminderMessage(
  kind: ReminderKind,
  lang: string,
  vars: Vars,
): { title: string; body: string } {
  const L: Lang = lang === 'fr' ? 'fr' : 'en';
  return { title: vars.order, body: COPY[L][kind](vars) };
}
