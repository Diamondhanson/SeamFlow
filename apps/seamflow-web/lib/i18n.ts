// ============================================================================
// Lightweight i18n for the marketing site. No framework — just two dictionaries
// and a `?lang=fr` query the LangToggle flips. English is the default.
// Legal page content lives in ./legal.ts (it's long); this file holds the
// landing + shared UI copy.
// ============================================================================

export type Lang = 'en' | 'fr';
export const LANGS: Lang[] = ['en', 'fr'];

/** Coerce an unknown query value into a supported language (English default). */
export function resolveLang(v: string | string[] | undefined): Lang {
  const s = Array.isArray(v) ? v[0] : v;
  return s === 'fr' ? 'fr' : 'en';
}

/** Append/replace `?lang=` on a path, preserving hash anchors. */
export function withLang(path: string, lang: Lang): string {
  const [base, hash] = path.split('#');
  const q = lang === 'en' ? '' : `?lang=${lang}`;
  return `${base}${q}${hash ? `#${hash}` : ''}`;
}

interface Feature {
  key: string;
  title: string;
  body: string;
}
interface Step {
  title: string;
  body: string;
}
interface Faq {
  q: string;
  a: string;
  href?: string;
  linkLabel?: string;
}

export const copy = {
  en: {
    nav: {
      features: 'Features',
      how: 'How it works',
      faq: 'FAQ',
      getApp: 'Get the app',
    },
    hero: {
      eyebrow: 'For tailors & fashion designers',
      title: 'Your whole workshop, in one calm place.',
      subtitle:
        'SeamFlow keeps your clients, measurements, orders and deadlines together — so nothing slips between the notebook, the group chat and your memory.',
      ctaPrimary: 'Get the app',
      ctaSecondary: 'See how it works',
      note: 'Works offline · English & French',
    },
    store: {
      soon: 'Coming soon',
      appStore: 'Download on the App Store',
      googlePlay: 'Get it on Google Play',
      androidEyebrow: 'Android APK',
      androidCta: 'Download for Android',
    },
    problem: {
      eyebrow: 'The problem',
      title: 'Measurements on paper. Dates in your head. Design refs in the group chat.',
      body: 'When everything lives in different places, a due date slips, a measurement gets re-taken, and a client asks "is it ready?" for the tenth time. It’s a lot to hold.',
      solutionTitle: 'SeamFlow holds it for you.',
      solutionBody:
        'One place for every client, order and fitting — with reminders, a shareable order page, and it all keeps working even when the network doesn’t.',
    },
    features: {
      heading: 'Everything the craft needs',
      subheading:
        'Purpose-built for how tailors actually work — not a generic to-do list.',
      items: [
        {
          key: 'clients',
          title: 'Clients & measurements',
          body: 'Save each client once, with as many measurement sets as they need. Build your own measurement templates per garment.',
        },
        {
          key: 'orders',
          title: 'Orders with status tracking',
          body: 'Registered → in progress → fitting → delivered. Everyone knows exactly where the work stands.',
        },
        {
          key: 'groups',
          title: 'Group orders',
          body: 'Wedding parties, aso-ebi, uniforms — coordinate a whole group with shared fabric and per-member measurements.',
        },
        {
          key: 'design',
          title: 'Design Studio',
          body: 'Save inspiration and fabric photos, and let AI turn a reference image into clean, structured design notes.',
        },
        {
          key: 'reminders',
          title: 'Due-date reminders',
          body: 'Fittings and deliveries never sneak up on you. Gentle nudges before every date.',
        },
        {
          key: 'share',
          title: 'Share with clients',
          body: 'Send a link and your client sees their order, status, fitting date and photos — no app to install.',
        },
        {
          key: 'offline',
          title: 'Bilingual & offline',
          body: 'Full English and French. Take orders and edit on the spot even with no signal — it syncs when you’re back.',
        },
        {
          key: 'fabric',
          title: 'Fabric library',
          body: 'Photograph your stock, track supplier and cost per meter, and attach fabric straight to an order.',
        },
      ] as Feature[],
    },
    steps: {
      eyebrow: 'Three steps',
      heading: 'Up and running in minutes',
      items: [
        {
          title: 'Add a client',
          body: 'Name, phone, measurements — or import straight from your contacts.',
        },
        {
          title: 'Create an order',
          body: 'Pick a garment, set the delivery date, add design notes and reference photos.',
        },
        {
          title: 'Get reminded',
          body: 'SeamFlow nudges you before every fitting and deadline, and keeps the client in the loop.',
        },
      ] as Step[],
    },
    vision: {
      eyebrow: 'Why we built it',
      title: 'The business companion for a craft that deserves one.',
      body: 'Independent tailors run real businesses on notebooks and memory. SeamFlow gives that craft modern tools — starting bilingual, built offline-first, and growing toward every language and market where great clothes are still made by hand.',
    },
    gallery: {
      heading: 'A look inside',
      subheading: 'A calm, considered interface — the same care you put into the work.',
    },
    faq: {
      heading: 'Questions, answered',
      items: [
        {
          q: 'How much does it cost?',
          a: 'SeamFlow is in early access. Core features are free while we build; any paid plan will be clearly optional.',
        },
        {
          q: 'What languages does it support?',
          a: 'English and French today, with more on the way.',
        },
        {
          q: 'Does it work offline?',
          a: 'Yes. You can browse, take orders and make edits with no connection; everything syncs when you’re back online.',
        },
        {
          q: 'Do my clients need to install anything?',
          a: 'No. You share a link and they view their order in any browser.',
        },
        {
          q: 'Is my data private?',
          a: 'Your data is yours — we don’t sell it. Our Privacy Policy spells out exactly what’s stored and your rights.',
          href: '/privacy',
          linkLabel: 'Read the Privacy Policy',
        },
        {
          q: 'Which devices does it run on?',
          a: 'Phones and tablets — Android today, iOS soon.',
        },
      ] as Faq[],
    },
    cta: {
      title: 'Bring your workshop together.',
      body: 'Join the tailors making SeamFlow their daily companion.',
      button: 'Get the app',
    },
    footer: {
      tagline: 'The calm home for your tailoring business.',
      product: 'Product',
      legal: 'Legal',
      contact: 'Contact',
      links: {
        features: 'Features',
        how: 'How it works',
        faq: 'FAQ',
        privacy: 'Privacy Policy',
        terms: 'Terms',
        support: 'Support',
      },
      email: 'hello@seamflow.app',
      rights: '© {year} SeamFlow. All rights reserved.',
      madeWith: 'Made for tailors, everywhere.',
    },
    legal: {
      lastUpdated: 'Last updated',
      backToHome: 'Back to home',
      draftNotice:
        'This is draft copy for review — please have it checked before publishing.',
      privacyTitle: 'Privacy Policy',
      termsTitle: 'Terms of Service',
      supportTitle: 'Support',
    },
    support: {
      intro: 'Need a hand? We’re happy to help.',
      emailHeading: 'Email us',
      emailBody: 'Write to us and we’ll get back to you within a couple of days.',
      faqHeading: 'Common questions',
      faqBody: 'Most answers live on our FAQ.',
      faqLink: 'Read the FAQ',
    },
  },

  fr: {
    nav: {
      features: 'Fonctionnalités',
      how: 'Comment ça marche',
      faq: 'FAQ',
      getApp: 'Obtenir l’app',
    },
    hero: {
      eyebrow: 'Pour les tailleurs et créateurs',
      title: 'Tout votre atelier, en un seul endroit serein.',
      subtitle:
        'SeamFlow réunit vos clients, mesures, commandes et échéances — pour que rien ne se perde entre le carnet, le groupe et votre mémoire.',
      ctaPrimary: 'Obtenir l’app',
      ctaSecondary: 'Voir comment ça marche',
      note: 'Fonctionne hors ligne · Français et anglais',
    },
    store: {
      soon: 'Bientôt disponible',
      appStore: 'Télécharger sur l’App Store',
      googlePlay: 'Disponible sur Google Play',
      androidEyebrow: 'APK Android',
      androidCta: 'Télécharger pour Android',
    },
    problem: {
      eyebrow: 'Le problème',
      title: 'Les mesures sur papier. Les dates dans la tête. Les inspirations dans le groupe.',
      body: 'Quand tout est éparpillé, une échéance passe, une mesure est reprise, et un client demande « c’est prêt ? » pour la dixième fois. Ça fait beaucoup à retenir.',
      solutionTitle: 'SeamFlow retient tout pour vous.',
      solutionBody:
        'Un seul endroit pour chaque client, commande et essayage — avec des rappels, une page de commande partageable, et tout continue de fonctionner même sans réseau.',
    },
    features: {
      heading: 'Tout ce dont le métier a besoin',
      subheading:
        'Pensé pour la façon dont les tailleurs travaillent vraiment — pas une simple liste de tâches.',
      items: [
        {
          key: 'clients',
          title: 'Clients et mesures',
          body: 'Enregistrez chaque client une fois, avec autant de jeux de mesures qu’il faut. Créez vos propres modèles de mesures par vêtement.',
        },
        {
          key: 'orders',
          title: 'Commandes avec suivi',
          body: 'Enregistrée → en cours → essayage → livrée. Chacun sait exactement où en est le travail.',
        },
        {
          key: 'groups',
          title: 'Commandes de groupe',
          body: 'Cortèges, aso-ebi, uniformes — coordonnez tout un groupe avec tissu partagé et mesures par membre.',
        },
        {
          key: 'design',
          title: 'Design Studio',
          body: 'Enregistrez inspirations et photos de tissu, et laissez l’IA transformer une image de référence en notes de conception claires.',
        },
        {
          key: 'reminders',
          title: 'Rappels d’échéance',
          body: 'Les essayages et livraisons ne vous surprennent plus. De doux rappels avant chaque date.',
        },
        {
          key: 'share',
          title: 'Partage avec les clients',
          body: 'Envoyez un lien : votre client voit sa commande, son statut, la date d’essayage et les photos — sans rien installer.',
        },
        {
          key: 'offline',
          title: 'Bilingue et hors ligne',
          body: 'Français et anglais complets. Prenez des commandes et modifiez sur place, même sans signal — la synchro se fait au retour du réseau.',
        },
        {
          key: 'fabric',
          title: 'Bibliothèque de tissus',
          body: 'Photographiez votre stock, suivez le fournisseur et le coût au mètre, et associez un tissu directement à une commande.',
        },
      ] as Feature[],
    },
    steps: {
      eyebrow: 'Trois étapes',
      heading: 'Opérationnel en quelques minutes',
      items: [
        {
          title: 'Ajoutez un client',
          body: 'Nom, téléphone, mesures — ou importez directement depuis vos contacts.',
        },
        {
          title: 'Créez une commande',
          body: 'Choisissez un vêtement, fixez la date de livraison, ajoutez des notes et des photos de référence.',
        },
        {
          title: 'Soyez rappelé',
          body: 'SeamFlow vous prévient avant chaque essayage et échéance, et tient le client informé.',
        },
      ] as Step[],
    },
    vision: {
      eyebrow: 'Pourquoi nous l’avons créé',
      title: 'Le compagnon d’affaires d’un métier qui le mérite.',
      body: 'Les tailleurs indépendants font tourner de vraies entreprises avec un carnet et leur mémoire. SeamFlow offre à ce métier des outils modernes — bilingue dès le départ, pensé hors-ligne, et s’ouvrant à chaque langue et marché où l’on crée encore de beaux vêtements à la main.',
    },
    gallery: {
      heading: 'Un aperçu de l’intérieur',
      subheading: 'Une interface calme et soignée — le même soin que vous mettez au travail.',
    },
    faq: {
      heading: 'Vos questions, nos réponses',
      items: [
        {
          q: 'Combien ça coûte ?',
          a: 'SeamFlow est en accès anticipé. Les fonctions essentielles sont gratuites pendant que nous construisons ; toute offre payante restera clairement facultative.',
        },
        {
          q: 'Quelles langues sont prises en charge ?',
          a: 'Le français et l’anglais aujourd’hui, d’autres à venir.',
        },
        {
          q: 'Est-ce que ça marche hors ligne ?',
          a: 'Oui. Vous pouvez consulter, prendre des commandes et modifier sans connexion ; tout se synchronise au retour du réseau.',
        },
        {
          q: 'Mes clients doivent-ils installer quelque chose ?',
          a: 'Non. Vous partagez un lien et ils voient leur commande dans n’importe quel navigateur.',
        },
        {
          q: 'Mes données sont-elles privées ?',
          a: 'Vos données vous appartiennent — nous ne les vendons pas. Notre Politique de confidentialité précise exactement ce qui est stocké et vos droits.',
          href: '/privacy',
          linkLabel: 'Lire la Politique de confidentialité',
        },
        {
          q: 'Sur quels appareils ?',
          a: 'Téléphones et tablettes — Android aujourd’hui, iOS bientôt.',
        },
      ] as Faq[],
    },
    cta: {
      title: 'Réunissez votre atelier.',
      body: 'Rejoignez les tailleurs qui font de SeamFlow leur compagnon quotidien.',
      button: 'Obtenir l’app',
    },
    footer: {
      tagline: 'Le foyer serein de votre activité de couture.',
      product: 'Produit',
      legal: 'Légal',
      contact: 'Contact',
      links: {
        features: 'Fonctionnalités',
        how: 'Comment ça marche',
        faq: 'FAQ',
        privacy: 'Politique de confidentialité',
        terms: 'Conditions',
        support: 'Support',
      },
      email: 'hello@seamflow.app',
      rights: '© {year} SeamFlow. Tous droits réservés.',
      madeWith: 'Conçu pour les tailleurs, partout.',
    },
    legal: {
      lastUpdated: 'Dernière mise à jour',
      backToHome: 'Retour à l’accueil',
      draftNotice:
        'Texte provisoire à relire — faites-le vérifier avant publication.',
      privacyTitle: 'Politique de confidentialité',
      termsTitle: 'Conditions d’utilisation',
      supportTitle: 'Support',
    },
    support: {
      intro: 'Besoin d’aide ? Nous sommes là.',
      emailHeading: 'Écrivez-nous',
      emailBody: 'Envoyez-nous un message, nous répondons sous quelques jours.',
      faqHeading: 'Questions fréquentes',
      faqBody: 'La plupart des réponses sont dans notre FAQ.',
      faqLink: 'Lire la FAQ',
    },
  },
};

export type Dict = (typeof copy)['en'];
export const getDict = (lang: Lang): Dict => copy[lang];

export const SITE = {
  name: 'SeamFlow',
  domain: 'seamflow.app',
  url: 'https://seamflow.app',
  email: 'hello@seamflow.app',
};

// Direct Android APK download. Empty string → not yet available (the Android
// badge falls back to a "coming soon" state). Set to the built .apk URL to turn
// on the real "Download for Android" button.
export const ANDROID_APK_URL = '';
