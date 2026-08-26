// ============================================================================
// Copy for the public catalogue page (/t/<slug>), EN/FR.
//
// Kept out of lib/i18n.ts for the same reason legal.ts is: that file holds the
// marketing site's shared chrome, and this is a distinct surface with its own
// vocabulary. Both languages live here so a missing translation is a visible
// hole in one object rather than a silent English fallback.
//
// A note on tone: this page is read by a tailor's actual customer, often after
// tapping a link in WhatsApp with no idea what SeamFlow is. So the copy talks
// about the SHOP, not about us. The only place the product is named is the
// small footer line — anything louder turns a tailor's shop window into our
// advertisement, which is not what they shared.
// ============================================================================

import type { Lang } from './i18n';

export interface CatalogueCopy {
  /** Small eyebrow above the shop name. */
  eyebrow: string;
  worksTitle: string;
  /** `{name}` → business name. */
  metaTitle: (name: string) => string;
  metaDescription: (name: string, count: number, city: string | null) => string;
  whatsappCta: string;
  whatsappHint: string;
  appCta: string;
  appSoon: string;
  emptyTitle: string;
  emptyBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  memberSince: (year: string) => string;
  pieces: (n: number) => string;
  verified: string;
  acceptsRemote: string;
  respondsIn: (hours: number) => string;
  /** Prefilled first line of the WhatsApp conversation. */
  whatsappPrefill: (name: string) => string;
  footerNote: string;
  poweredBy: string;
  viewMore: string;
  closeLabel: string;
}

export const catalogueCopy: Record<Lang, CatalogueCopy> = {
  en: {
    eyebrow: 'Catalogue',
    worksTitle: 'Recent work',
    metaTitle: (name) => `${name} — catalogue`,
    metaDescription: (name, count, city) => {
      const where = city ? ` in ${city}` : '';
      if (count === 0) return `${name}${where} on SeamFlow.`;
      return `${count} piece${count === 1 ? '' : 's'} made by ${name}${where}. Browse the catalogue and message the workshop directly.`;
    },
    whatsappCta: 'Message on WhatsApp',
    whatsappHint: 'Ask about a piece, a price, or your own measurements.',
    appCta: 'Get the SeamFlow app',
    appSoon: 'Coming soon',
    emptyTitle: 'Nothing published yet',
    emptyBody:
      'This workshop has not added any pieces to its catalogue yet. Check back soon.',
    notFoundTitle: 'Catalogue not found',
    notFoundBody:
      'This link may be mistyped, or the workshop may no longer be listed.',
    memberSince: (year) => `On SeamFlow since ${year}`,
    pieces: (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`,
    verified: 'Verified',
    acceptsRemote: 'Takes remote orders',
    respondsIn: (h) => (h <= 1 ? 'Usually replies within an hour' : `Usually replies within ${h}h`),
    whatsappPrefill: (name) => `Hello ${name}, I saw your catalogue on SeamFlow.`,
    footerNote: 'Made with care.',
    poweredBy: 'Catalogue powered by SeamFlow',
    viewMore: 'Show more',
    closeLabel: 'Close',
  },
  fr: {
    eyebrow: 'Catalogue',
    worksTitle: 'Réalisations récentes',
    metaTitle: (name) => `${name} — catalogue`,
    metaDescription: (name, count, city) => {
      const where = city ? ` à ${city}` : '';
      if (count === 0) return `${name}${where} sur SeamFlow.`;
      return `${count} pièce${count === 1 ? '' : 's'} réalisée${count === 1 ? '' : 's'} par ${name}${where}. Parcourez le catalogue et contactez l'atelier directement.`;
    },
    whatsappCta: 'Écrire sur WhatsApp',
    whatsappHint: 'Renseignez-vous sur une pièce, un prix ou vos mesures.',
    appCta: 'Obtenir l’application SeamFlow',
    appSoon: 'Bientôt disponible',
    emptyTitle: 'Rien de publié pour le moment',
    emptyBody:
      'Cet atelier n’a pas encore ajouté de pièces à son catalogue. Revenez bientôt.',
    notFoundTitle: 'Catalogue introuvable',
    notFoundBody:
      'Ce lien est peut-être mal saisi, ou l’atelier n’est plus référencé.',
    memberSince: (year) => `Sur SeamFlow depuis ${year}`,
    pieces: (n) => `${n} ${n === 1 ? 'pièce' : 'pièces'}`,
    verified: 'Vérifié',
    acceptsRemote: 'Accepte les commandes à distance',
    respondsIn: (h) =>
      h <= 1 ? 'Répond généralement en moins d’une heure' : `Répond généralement en ${h}h`,
    whatsappPrefill: (name) => `Bonjour ${name}, j’ai vu votre catalogue sur SeamFlow.`,
    footerNote: 'Fait avec soin.',
    poweredBy: 'Catalogue propulsé par SeamFlow',
    viewMore: 'Voir plus',
    closeLabel: 'Fermer',
  },
};

export const getCatalogueCopy = (lang: Lang): CatalogueCopy => catalogueCopy[lang];
