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

export type LanguageCode = 'en' | 'fr';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export const translations = {
  en: {
    common: common.en,
    settings: settings.en,
    auth: auth.en,
    home: home.en,
    clients: clients.en,
    orders: orders.en,
    groups: groups.en,
    templates: templates.en,
    measurements: measurements.en,
    fabrics: fabrics.en,
    designs: designs.en,
    invoices: invoices.en,
    guides: guides.en,
    misc: misc.en,
    assistant: assistant.en,
    feed: feed.en,
    chat: chat.en,
    notifications: notifications.en,
    share: share.en,
    drafts: drafts.en,
    specialties: specialties.en,
    requests: requests.en,
  },
  fr: {
    common: common.fr,
    settings: settings.fr,
    auth: auth.fr,
    home: home.fr,
    clients: clients.fr,
    orders: orders.fr,
    groups: groups.fr,
    templates: templates.fr,
    measurements: measurements.fr,
    fabrics: fabrics.fr,
    designs: designs.fr,
    invoices: invoices.fr,
    guides: guides.fr,
    misc: misc.fr,
    assistant: assistant.fr,
    feed: feed.fr,
    chat: chat.fr,
    notifications: notifications.fr,
    share: share.fr,
    drafts: drafts.fr,
    specialties: specialties.fr,
    requests: requests.fr,
  },
} as const;

export type Translations = typeof translations.en;
