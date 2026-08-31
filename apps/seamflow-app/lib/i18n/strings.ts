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

export type LanguageCode = 'en' | 'fr' | 'pt';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  // Endonyms, not English names: a Portuguese speaker scanning a language list
  // is looking for "Português", not "Portuguese".
  { code: 'pt', label: 'Português' },
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
};

/** English is the reference shape; every other language must match it. */
export type Translations = typeof translations.en;
