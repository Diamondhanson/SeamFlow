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
    account: account.en,
    orders: orders.en,
    measurements: measurements.en,
    claim: claim.en,
    guides: guides.en,
    misc: misc.en,
    discover: discover.en,
    chat: chat.en,
    notifications: notifications.en,
    requests: requests.en,
  },
  fr: {
    common: common.fr,
    auth: auth.fr,
    home: home.fr,
    account: account.fr,
    orders: orders.fr,
    measurements: measurements.fr,
    claim: claim.fr,
    guides: guides.fr,
    misc: misc.fr,
    discover: discover.fr,
    chat: chat.fr,
    notifications: notifications.fr,
    requests: requests.fr,
  },
} as const;

export type Translations = typeof translations.en;
