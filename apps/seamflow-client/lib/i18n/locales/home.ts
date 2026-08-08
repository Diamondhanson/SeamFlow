export const home = {
  en: {
    // ----- greeting -----
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    welcome: 'Welcome',
    // ----- home shell -----
    tagline: 'Your style, in one place.',
    ordersTile: 'My orders',
    ordersTileSub: 'Track what your tailors are making',
    measurementsTile: 'My measurements',
    measurementsTileSub: 'Your sizes, ready to share',
    lookbookTile: 'Lookbook',
    lookbookTileSub: 'Every piece made for you',
    tailorsTile: 'My tailors',
    tailorsTileSub: 'The people who make your clothes',
    comingSoon: 'Coming soon',
    settings: 'Settings',
  },
  fr: {
    // ----- greeting -----
    goodMorning: 'Bonjour',
    // 'Bon après-midi' is a FAREWELL in French — what you say when leaving
    // someone, not when greeting them. French greets with 'Bonjour' right
    // through the afternoon and only switches at dusk, so morning and
    // afternoon deliberately share a value here. Do not "fix" the
    // duplication by inventing a distinct afternoon greeting.
    goodAfternoon: 'Bonjour',
    goodEvening: 'Bonsoir',
    welcome: 'Bienvenue',
    // ----- home shell -----
    tagline: 'Votre style, au même endroit.',
    ordersTile: 'Mes commandes',
    ordersTileSub: 'Suivez ce que vos tailleurs réalisent',
    measurementsTile: 'Mes mesures',
    measurementsTileSub: 'Vos tailles, prêtes à partager',
    lookbookTile: 'Lookbook',
    lookbookTileSub: 'Chaque pièce réalisée pour vous',
    tailorsTile: 'Mes tailleurs',
    tailorsTileSub: 'Les personnes qui confectionnent vos vêtements',
    comingSoon: 'Bientôt disponible',
    settings: 'Paramètres',
  },
} as const;
