// Discovery — the client app's front door (ROADMAP Appendix D.6).
// English is the source of truth; French mirrors it.
export const discover = {
  en: {
    // ── Feed ────────────────────────────────────────────────────────────────
    title: 'Discover',
    subtitle: 'Real work, by real tailors near you.',
    emptyTitle: 'Nothing here yet',
    emptyBody:
      'Tailors are still adding their work. Check back shortly — the feed fills up as they publish.',
    filterAll: 'All',
    filterWomen: 'Women',
    filterMen: 'Men',
    filterUnisex: 'Unisex',
    filterChildren: 'Children',
    occasionWedding: 'Wedding',
    occasionTraditional: 'Traditional',
    occasionCorporate: 'Corporate',
    occasionCasual: 'Casual',
    occasionParty: 'Party',
    clearFilters: 'Clear',
    searchPlaceholder: 'Search styles, fabrics, garments…',
    noMatch: 'Nothing matches those filters yet.',

    // ── Design detail ───────────────────────────────────────────────────────
    byTailor: 'By {name}',
    verified: 'Verified',
    repliesIn: 'Usually replies in {hours}h',
    acceptsRemote: 'Works with clients anywhere',
    fromPrice: 'From {price}',
    inquire: 'Ask about this',
    save: 'Save',
    saved: 'Saved',
    moreLikeThis: 'More like this',
    viewTailor: 'See more of their work',

    // ── Storefront ──────────────────────────────────────────────────────────
    storefrontWorks: 'Their work',
    storefrontEmpty: 'Nothing published yet.',
    memberSince: 'On SeamFlow since {date}',
    specialties: 'Specialties',
    speaks: 'Speaks',

    // ── Inquire ─────────────────────────────────────────────────────────────
    inquireTitle: 'Ask about this piece',
    inquireBody:
      'Send {name} a message. They’ll see the design you’re asking about, and you can talk it through here.',
    inquirePlaceholder: 'Hi! Could you make something like this for me?',
    inquireSend: 'Send message',
    inquireSending: 'Sending…',
    inquireSignInTitle: 'Sign in to send a message',
    inquireSignInBody:
      'You can browse everything without an account. Signing in just lets tailors reply to you.',
    inquireSignIn: 'Sign in',

    // ── Nav ─────────────────────────────────────────────────────────────────
    tabDiscover: 'Discover',
    tabMessages: 'Messages',
    tabOrders: 'My orders',
  },
  fr: {
    title: 'Découvrir',
    subtitle: 'Du vrai travail, par de vrais tailleurs près de chez vous.',
    emptyTitle: 'Rien pour l’instant',
    emptyBody:
      'Les tailleurs ajoutent encore leurs réalisations. Revenez bientôt — le fil se remplit à mesure qu’ils publient.',
    filterAll: 'Tout',
    filterWomen: 'Femmes',
    filterMen: 'Hommes',
    filterUnisex: 'Mixte',
    filterChildren: 'Enfants',
    occasionWedding: 'Mariage',
    occasionTraditional: 'Traditionnel',
    occasionCorporate: 'Professionnel',
    occasionCasual: 'Décontracté',
    occasionParty: 'Fête',
    clearFilters: 'Effacer',
    searchPlaceholder: 'Rechercher styles, tissus, vêtements…',
    noMatch: 'Rien ne correspond à ces filtres pour l’instant.',

    byTailor: 'Par {name}',
    verified: 'Vérifié',
    repliesIn: 'Répond généralement en {hours} h',
    acceptsRemote: 'Travaille avec des clients partout',
    fromPrice: 'À partir de {price}',
    inquire: 'Demander ce modèle',
    save: 'Enregistrer',
    saved: 'Enregistré',
    moreLikeThis: 'Dans le même esprit',
    viewTailor: 'Voir plus de son travail',

    storefrontWorks: 'Ses réalisations',
    storefrontEmpty: 'Rien de publié pour l’instant.',
    memberSince: 'Sur SeamFlow depuis {date}',
    specialties: 'Spécialités',
    speaks: 'Parle',

    inquireTitle: 'Demander ce modèle',
    inquireBody:
      'Envoyez un message à {name}. Le modèle concerné lui sera montré, et vous pourrez en discuter ici.',
    inquirePlaceholder: 'Bonjour ! Pourriez-vous me faire quelque chose comme ceci ?',
    inquireSend: 'Envoyer le message',
    inquireSending: 'Envoi…',
    inquireSignInTitle: 'Connectez-vous pour envoyer un message',
    inquireSignInBody:
      'Vous pouvez tout parcourir sans compte. La connexion sert uniquement à permettre aux tailleurs de vous répondre.',
    inquireSignIn: 'Se connecter',

    tabDiscover: 'Découvrir',
    tabMessages: 'Messages',
    tabOrders: 'Mes commandes',
  },
} as const;
