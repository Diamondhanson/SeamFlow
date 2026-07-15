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
import { orders } from './locales/orders';
import { measurements } from './locales/measurements';
import { claim } from './locales/claim';
import { guides } from './locales/guides';
import { misc } from './locales/misc';

export type LanguageCode = 'en' | 'fr';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export const translations = {
  en: {
    common: common.en,
    auth: auth.en,
    home: home.en,
    orders: orders.en,
    measurements: measurements.en,
    claim: claim.en,
    guides: guides.en,
    misc: misc.en,
  },
  fr: {
    common: common.fr,
    auth: auth.fr,
    home: home.fr,
    orders: orders.fr,
    measurements: measurements.fr,
    claim: claim.fr,
    guides: guides.fr,
    misc: misc.fr,
  },
} as const;

export type Translations = typeof translations.en;
