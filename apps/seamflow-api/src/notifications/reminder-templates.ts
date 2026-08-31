// Localized push copy for order reminders. Push is sent server-side, so this
// does NOT use the app's t(); it's a small parallel dictionary. Keep the keys
// in sync with the languages the app supports.
//
// A tailor who set their app to Swahili and then gets an English reminder has
// been told, in effect, that the translation was cosmetic. So this list tracks
// the app's LanguageCode rather than lagging behind it.

type Lang = 'en' | 'fr' | 'pt' | 'es' | 'sw';

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
  pt: {
    dueInDays: (v: Vars) =>
      `${v.order} é para entregar daqui a ${v.n} dia${v.n === 1 ? '' : 's'}`,
    dueToday: (v: Vars) => `${v.order} é para entregar hoje`,
    overdue: (v: Vars) => `${v.order} está atrasada`,
  },
  es: {
    dueInDays: (v: Vars) =>
      `${v.order} se entrega en ${v.n} día${v.n === 1 ? '' : 's'}`,
    dueToday: (v: Vars) => `${v.order} se entrega hoy`,
    overdue: (v: Vars) => `${v.order} está atrasado`,
  },
  sw: {
    dueInDays: (v: Vars) => `${v.order} litakabidhiwa baada ya siku ${v.n}`,
    dueToday: (v: Vars) => `${v.order} litakabidhiwa leo`,
    overdue: (v: Vars) => `${v.order} limechelewa`,
  },
} as const;

export type ReminderKind = 'dueInDays' | 'dueToday' | 'overdue';

/** Build the localized { title, body } for a reminder push. */
export function reminderMessage(
  kind: ReminderKind,
  lang: string,
  vars: Vars,
): { title: string; body: string } {
  const L: Lang = lang in COPY ? (lang as Lang) : 'en';
  return { title: vars.order, body: COPY[L][kind](vars) };
}
