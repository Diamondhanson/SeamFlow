// ============================================================================
// Translation dictionary — aggregator.
//
// English is the source of truth; other languages mirror its keys. Missing
// keys fall back to English, then to the raw key (see lib/i18n). Strings are
// split by area under ./locales/* so screens can be internationalized
// independently. Add a language by extending each locale file's shape and
// registering it in LANGUAGES.
//
// Interpolation: use `{name}` placeholders, resolved via t('key', { name }).
// ============================================================================

import { common } from './locales/common';
import { settings } from './locales/settings';
import { account } from './locales/account';
import { auth } from './locales/auth';
import { home } from './locales/home';
import { clients } from './locales/clients';
import { orders } from './locales/orders';
import { groups } from './locales/groups';
import { templates } from './locales/templates';
import { measurements } from './locales/measurements';
import { fabrics } from './locales/fabrics';
import { designs } from './locales/designs';
import { invoices } from './locales/invoices';
import { guides } from './locales/guides';
import { misc } from './locales/misc';
import { assistant } from './locales/assistant';
import { feed } from './locales/feed';
import { chat } from './locales/chat';
import { notifications } from './locales/notifications';
import { share } from './locales/share';
import { drafts } from './locales/drafts';
import { specialties } from './locales/specialties';
import { requests } from './locales/requests';

export type LanguageCode = 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';

export interface LanguageDef {
  code: LanguageCode;
  label: string;
  /**
   * Writing direction. Declared per language rather than inferred from a list
   * of RTL codes, so a new language cannot be added without deciding — and a
   * right-to-left one cannot silently ship rendering left-to-right.
   */
  dir: 'ltr' | 'rtl';
  /**
   * BCP-47 tag for `Intl` formatting — dates, money, plurals.
   *
   * Arabic is pinned to `ar-u-nu-latn-ca-gregory` rather than bare `ar`:
   * without it, `Intl` renders Eastern Arabic numerals (٠١٢٣), which would
   * break the tabular alignment of stacked measurement columns and put two
   * numeral systems on the same invoice. `ca-gregory` means a future CLDR
   * bump cannot silently switch the calendar to Hijri.
   */
  intl: string;
}

export const LANGUAGES: LanguageDef[] = [
  { code: 'en', intl: 'en-US', label: 'English', dir: 'ltr' },
  { code: 'fr', intl: 'fr-FR', label: 'Français', dir: 'ltr' },
  // Endonyms, not English names: a Portuguese speaker scanning a language list
  // is looking for "Português", not "Portuguese".
  { code: 'pt', intl: 'pt-PT', label: 'Português', dir: 'ltr' },
  { code: 'es', intl: 'es-419', label: 'Español', dir: 'ltr' },
  { code: 'sw', intl: 'sw-KE', label: 'Kiswahili', dir: 'ltr' },
  // The first right-to-left language. `dir` drives I18nManager.forceRTL, and
  // the pinned `intl` tag keeps digits Western — see LanguageDef.
  { code: 'ar', intl: 'ar-u-nu-latn-ca-gregory', label: 'العربية', dir: 'rtl' },
];

/**
 * Every namespace, keyed by name. Listed once rather than once per language.
 *
 * The old shape spelled all 23 namespaces out again for each locale, so adding
 * a language meant 23 more lines that had to stay in step by hand — exactly the
 * kind of list that silently loses an entry.
 */
const NAMESPACES = {
  common,
  settings,
  account,
  auth,
  home,
  clients,
  orders,
  groups,
  templates,
  measurements,
  fabrics,
  designs,
  invoices,
  guides,
  misc,
  assistant,
  feed,
  chat,
  notifications,
  share,
  drafts,
  specialties,
  requests,
} as const;

type Namespaces = typeof NAMESPACES;

/**
 * Pull one language out of every namespace.
 *
 * Typed so that a namespace missing the requested language is a compile error
 * naming the file, which makes TypeScript the checklist when a language is
 * being rolled out.
 */
function forLanguage<L extends LanguageCode>(lang: L): { [K in keyof Namespaces]: Namespaces[K][L] } {
  const out = {} as { [K in keyof Namespaces]: Namespaces[K][L] };
  for (const key of Object.keys(NAMESPACES) as (keyof Namespaces)[]) {
    // Safe by construction: the mapped return type already requires every
    // namespace to carry `lang`.
    (out as Record<string, unknown>)[key] = NAMESPACES[key][lang];
  }
  return out;
}

export const translations = {
  en: forLanguage('en'),
  fr: forLanguage('fr'),
  pt: forLanguage('pt'),
  es: forLanguage('es'),
  sw: forLanguage('sw'),
  ar: forLanguage('ar'),
};

/** English is the reference shape; every other language must match it. */
export type Translations = typeof translations.en;
