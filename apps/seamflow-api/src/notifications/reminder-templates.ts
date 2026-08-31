// Localized push copy for order reminders. Push is sent server-side, so this
// does NOT use the app's t(); it's a small parallel dictionary. Keep the keys
// in sync with the languages the app supports.
//
// A tailor who set their app to Swahili and then gets an English reminder has
// been told, in effect, that the translation was cosmetic. So this list tracks
// the app's LanguageCode rather than lagging behind it.
//
// ── Why the plural messages are records of forms, not template functions ────
//
// The obvious shape for `dueInDays` is `${n} day${n === 1 ? '' : 's'}`, and it
// works for every language here except Arabic. The problem is NOT that Arabic
// has six plural categories instead of two — a longer ternary could express
// that. It is that the `one` and `two` forms carry the number INSIDE the noun:
// "يومين" already means "two days", so rendering "2 يومين" reads as "2 two-days".
//
// A form that omits the count entirely cannot be written as a suffix appended
// to `${n}`. That is the structural reason for the shape below, and it is why
// this should not be "simplified" back to functions.

type Lang = 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';

interface Vars {
  order: string;
  n?: number; // days until due, for the lead reminders
}

/**
 * One string per CLDR plural category. `other` is required — every language has
 * it, and it is the fallback when a category is absent.
 *
 * `{order}` and `{n}` are the only placeholders. `{n}` may be omitted where the
 * language's form already implies the count.
 */
type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** BCP-47 tag per language, for plural selection and number formatting. */
const INTL_TAG: Record<Lang, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-PT',
  es: 'es-419',
  sw: 'sw-KE',
  // Latin digits, Gregorian calendar — see the app's language record.
  ar: 'ar-u-nu-latn-ca-gregory',
};

const COPY: Record<
  Lang,
  { dueInDays: PluralForms; dueToday: string; overdue: string }
> = {
  en: {
    dueInDays: { one: '{order} is due in {n} day', other: '{order} is due in {n} days' },
    dueToday: '{order} is due today',
    overdue: '{order} is overdue',
  },
  fr: {
    dueInDays: { one: '{order} est à livrer dans {n} jour', other: '{order} est à livrer dans {n} jours' },
    dueToday: "{order} est à livrer aujourd'hui",
    overdue: '{order} est en retard',
  },
  pt: {
    dueInDays: { one: '{order} é para entregar daqui a {n} dia', other: '{order} é para entregar daqui a {n} dias' },
    dueToday: '{order} é para entregar hoje',
    overdue: '{order} está atrasada',
  },
  es: {
    dueInDays: { one: '{order} se entrega en {n} día', other: '{order} se entrega en {n} días' },
    dueToday: '{order} se entrega hoy',
    overdue: '{order} está atrasado',
  },
  sw: {
    // Swahili sidesteps agreement here — the phrasing is the same for every n.
    dueInDays: { other: '{order} litakabidhiwa baada ya siku {n}' },
    dueToday: '{order} litakabidhiwa leo',
    overdue: '{order} limechelewa',
  },
  ar: {
    // All six CLDR categories. Note `one` and `two` carry no {n}: "غدًا"
    // (tomorrow) and "يومين" (two days) already contain the count, and
    // prefixing a numeral would read as "2 two-days".
    dueInDays: {
      zero: '{order} يُسلَّم اليوم',
      one: '{order} يُسلَّم غدًا',
      two: '{order} يُسلَّم بعد يومين',
      few: '{order} يُسلَّم بعد {n} أيام',
      many: '{order} يُسلَّم بعد {n} يومًا',
      other: '{order} يُسلَّم بعد {n} يوم',
    },
    dueToday: '{order} يُسلَّم اليوم',
    overdue: '{order} تأخّر عن موعده',
  },
};

export type ReminderKind = 'dueInDays' | 'dueToday' | 'overdue';

// Intl.PluralRules construction is not free and these are hot on a reminder
// sweep, so instances are reused.
const PLURAL_RULES = new Map<string, Intl.PluralRules>();
function pluralRules(tag: string): Intl.PluralRules {
  let r = PLURAL_RULES.get(tag);
  if (!r) {
    r = new Intl.PluralRules(tag);
    PLURAL_RULES.set(tag, r);
  }
  return r;
}

function fill(template: string, vars: Vars, tag: string): string {
  return template
    .replace('{order}', vars.order)
    .replace('{n}', vars.n === undefined ? '' : new Intl.NumberFormat(tag).format(vars.n));
}

/** Build the localized { title, body } for a reminder push. */
export function reminderMessage(
  kind: ReminderKind,
  lang: string,
  vars: Vars,
): { title: string; body: string } {
  const L: Lang = lang in COPY ? (lang as Lang) : 'en';
  const tag = INTL_TAG[L];
  const entry = COPY[L][kind];

  if (typeof entry === 'string') {
    return { title: vars.order, body: fill(entry, vars, tag) };
  }

  // Intl decides the category, not us — `other` is unreachable in English for
  // the values this is called with, but that is a property of the data, not
  // something worth encoding here.
  const category = pluralRules(tag).select(vars.n ?? 0);
  const template = entry[category] ?? entry.other;
  return { title: vars.order, body: fill(template, vars, tag) };
}
