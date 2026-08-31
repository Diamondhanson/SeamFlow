// ============================================================================
// Translation dictionary — aggregator (client app).
//
// English is the source of truth; French mirrors its keys. Missing keys fall
// back to English, then to the raw key. Split by area under ./locales/*.
// A build-time guard (`npm run i18n:check`) enforces en/fr parity + flags
// hardcoded user-facing strings.
// ============================================================================

import { common } from './locales/common';
import { auth } from './locales/auth';
import { home } from './locales/home';
import { account } from './locales/account';
import { orders } from './locales/orders';
import { measurements } from './locales/measurements';
import { claim } from './locales/claim';
import { guides } from './locales/guides';
import { misc } from './locales/misc';
import { discover } from './locales/discover';
import { chat } from './locales/chat';
import { notifications } from './locales/notifications';
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
  // The first right-to-left language — see LanguageDef for what `dir` drives.
  { code: 'ar', intl: 'ar-u-nu-latn-ca-gregory', label: 'العربية', dir: 'rtl' },
];

/**
 * Every namespace, keyed by name. Listed once rather than once per language —
 * see the same note in the tailor app's strings.ts.
 */
const NAMESPACES = {
  common,
  auth,
  home,
  account,
  orders,
  measurements,
  claim,
  guides,
  misc,
  discover,
  chat,
  notifications,
  requests,
} as const;

type Namespaces = typeof NAMESPACES;

/**
 * Pull one language out of every namespace. Typed so a namespace missing the
 * requested language is a compile error naming the file.
 */
function forLanguage<L extends LanguageCode>(lang: L): { [K in keyof Namespaces]: Namespaces[K][L] } {
  const out = {} as { [K in keyof Namespaces]: Namespaces[K][L] };
  for (const key of Object.keys(NAMESPACES) as (keyof Namespaces)[]) {
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
