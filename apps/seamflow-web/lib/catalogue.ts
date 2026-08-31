// ============================================================================
// Copy for the public catalogue page (/t/<slug>), one block per language.
//
// Kept out of lib/i18n.ts for the same reason legal.ts is: that file holds the
// marketing site's shared chrome, and this is a distinct surface with its own
// vocabulary. Every language lives here so a missing translation is a visible
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
  /** `{price}` → already-formatted money. */
  fromPrice: (price: string) => string;
  photoCount: (n: number) => string;
  nextPhoto: string;
  prevPhoto: string;
  /** Per-design enquiry button, inside the lightbox. */
  inquire: string;
  /**
   * The message the client sends about one design.
   *
   * Carries the design's name, its price when there is one, and a link back to
   * this exact piece — the tailor should be able to see what is being asked
   * about without going hunting. Written to be edited before sending, so it
   * reads like a person rather than a form submission.
   */
  inquiryMessage: (input: {
    shop: string;
    design: string;
    price: string | null;
    url: string;
  }) => string;
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
    // "From" rather than a flat figure: this is made-to-measure work, where
    // fabric and finishing move the final number. A price shown as exact is a
    // promise the tailor did not make.
    fromPrice: (price) => `From ${price}`,
    photoCount: (n) => `${n} photos`,
    nextPhoto: 'Next photo',
    prevPhoto: 'Previous photo',
    inquire: 'Ask about this piece',
    inquiryMessage: ({ shop, design, price, url }) =>
      [
        `Hello ${shop}, I'm interested in ${design}${price ? ` (${price})` : ''}.`,
        '',
        url,
      ].join('\n'),
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
    fromPrice: (price) => `À partir de ${price}`,
    photoCount: (n) => `${n} photos`,
    nextPhoto: 'Photo suivante',
    prevPhoto: 'Photo précédente',
    inquire: 'Demander pour cette pièce',
    inquiryMessage: ({ shop, design, price, url }) =>
      [
        `Bonjour ${shop}, je suis intéressé(e) par ${design}${price ? ` (${price})` : ''}.`,
        '',
        url,
      ].join('\n'),
  },
  pt: {
    eyebrow: 'Catálogo',
    worksTitle: 'Trabalhos recentes',
    metaTitle: (name) => `${name} — catálogo`,
    metaDescription: (name, count, city) => {
      const where = city ? ` em ${city}` : '';
      if (count === 0) return `${name}${where} no SeamFlow.`;
      return `${count} peça${count === 1 ? '' : 's'} feita${count === 1 ? '' : 's'} por ${name}${where}. Veja o catálogo e fale diretamente com o atelier.`;
    },
    whatsappCta: 'Enviar mensagem no WhatsApp',
    whatsappHint: 'Pergunte sobre uma peça, um preço ou as suas medidas.',
    appCta: 'Obter a aplicação SeamFlow',
    appSoon: 'Em breve',
    emptyTitle: 'Ainda sem nada publicado',
    emptyBody:
      'Este atelier ainda não acrescentou peças ao catálogo. Volte em breve.',
    notFoundTitle: 'Catálogo não encontrado',
    notFoundBody:
      'A ligação pode estar mal escrita, ou o atelier pode já não estar listado.',
    memberSince: (year) => `No SeamFlow desde ${year}`,
    pieces: (n) => `${n} ${n === 1 ? 'peça' : 'peças'}`,
    verified: 'Verificado',
    acceptsRemote: 'Aceita encomendas à distância',
    respondsIn: (h) =>
      h <= 1 ? 'Costuma responder em menos de uma hora' : `Costuma responder em ${h}h`,
    whatsappPrefill: (name) => `Olá ${name}, vi o seu catálogo no SeamFlow.`,
    footerNote: 'Feito com cuidado.',
    poweredBy: 'Catálogo com tecnologia SeamFlow',
    viewMore: 'Ver mais',
    closeLabel: 'Fechar',
    fromPrice: (price) => `A partir de ${price}`,
    photoCount: (n) => `${n} fotos`,
    nextPhoto: 'Foto seguinte',
    prevPhoto: 'Foto anterior',
    inquire: 'Perguntar sobre esta peça',
    inquiryMessage: ({ shop, design, price, url }) =>
      [
        `Olá ${shop}, estou interessado(a) em ${design}${price ? ` (${price})` : ''}.`,
        '',
        url,
      ].join('\n'),
  },
  es: {
    eyebrow: 'Catálogo',
    worksTitle: 'Trabajos recientes',
    metaTitle: (name) => `${name} — catálogo`,
    metaDescription: (name, count, city) => {
      const where = city ? ` en ${city}` : '';
      if (count === 0) return `${name}${where} en SeamFlow.`;
      return `${count} pieza${count === 1 ? '' : 's'} hecha${count === 1 ? '' : 's'} por ${name}${where}. Vea el catálogo y escriba directamente al taller.`;
    },
    whatsappCta: 'Escribir por WhatsApp',
    whatsappHint: 'Pregunte por una pieza, por un precio o por sus propias medidas.',
    appCta: 'Obtener la app SeamFlow',
    appSoon: 'Próximamente',
    emptyTitle: 'Aún no hay nada publicado',
    emptyBody:
      'Este taller todavía no ha agregado piezas a su catálogo. Vuelva pronto.',
    notFoundTitle: 'Catálogo no encontrado',
    notFoundBody:
      'Puede que el enlace esté mal escrito, o que el taller ya no aparezca listado.',
    memberSince: (year) => `En SeamFlow desde ${year}`,
    pieces: (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`,
    verified: 'Verificado',
    acceptsRemote: 'Acepta pedidos a distancia',
    respondsIn: (h) =>
      h <= 1 ? 'Suele responder en menos de una hora' : `Suele responder en menos de ${h} h`,
    whatsappPrefill: (name) => `Hola ${name}, vi su catálogo en SeamFlow.`,
    footerNote: 'Hecho con cuidado.',
    poweredBy: 'Catálogo con la tecnología de SeamFlow',
    viewMore: 'Ver más',
    closeLabel: 'Cerrar',
    fromPrice: (price) => `Desde ${price}`,
    photoCount: (n) => `${n} fotos`,
    nextPhoto: 'Foto siguiente',
    prevPhoto: 'Foto anterior',
    inquire: 'Preguntar por esta pieza',
    inquiryMessage: ({ shop, design, price, url }) =>
      [
        `Hola ${shop}, me interesa ${design}${price ? ` (${price})` : ''}.`,
        '',
        url,
      ].join('\n'),
  },
  sw: {
    eyebrow: 'Katalogi',
    worksTitle: 'Kazi za hivi karibuni',
    metaTitle: (name) => `${name} — katalogi`,
    metaDescription: (name, count, city) => {
      const where = city ? ` ${city}` : '';
      if (count === 0) return `${name}${where} kwenye SeamFlow.`;
      return `Vipande ${count} vilivyoshonwa na ${name}${where}. Tazama katalogi na umwandikie mshonaji moja kwa moja.`;
    },
    whatsappCta: 'Andika kwa WhatsApp',
    whatsappHint: 'Uliza kuhusu kipande, bei, au vipimo vyako mwenyewe.',
    appCta: 'Pata programu ya SeamFlow',
    appSoon: 'Inakuja hivi karibuni',
    emptyTitle: 'Bado hakuna kilichochapishwa',
    emptyBody:
      'Duka hili bado halijaongeza vipande kwenye katalogi yake. Rudi hivi karibuni.',
    notFoundTitle: 'Katalogi haikupatikana',
    notFoundBody:
      'Huenda kiungo hiki kimeandikwa vibaya, au duka halijaorodheshwa tena.',
    memberSince: (year) => `Yupo SeamFlow tangu ${year}`,
    pieces: (n) => `Vipande ${n}`,
    verified: 'Amethibitishwa',
    acceptsRemote: 'Hupokea maagizo ya mbali',
    respondsIn: (h) =>
      h <= 1 ? 'Hujibu kwa kawaida ndani ya saa moja' : `Hujibu kwa kawaida ndani ya saa ${h}`,
    whatsappPrefill: (name) => `Habari ${name}, nimeona katalogi yako kwenye SeamFlow.`,
    footerNote: 'Imeshonwa kwa uangalifu.',
    poweredBy: 'Katalogi inaendeshwa na SeamFlow',
    viewMore: 'Onyesha zaidi',
    closeLabel: 'Funga',
    fromPrice: (price) => `Kuanzia ${price}`,
    photoCount: (n) => `Picha ${n}`,
    nextPhoto: 'Picha inayofuata',
    prevPhoto: 'Picha iliyotangulia',
    inquire: 'Uliza kuhusu kipande hiki',
    inquiryMessage: ({ shop, design, price, url }) =>
      [
        `Habari ${shop}, ninavutiwa na ${design}${price ? ` (${price})` : ''}.`,
        '',
        url,
      ].join('\n'),
  },
};

export const getCatalogueCopy = (lang: Lang): CatalogueCopy => catalogueCopy[lang];
