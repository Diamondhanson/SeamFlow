// ============================================================================
// Lightweight i18n for the marketing site. No framework — just two dictionaries
// and a `?lang=fr` query the LangToggle flips. English is the default.
// Legal page content lives in ./legal.ts (it's long); this file holds the
// landing + shared UI copy.
//
// SEO note: the site targets the generic category phrase "tailor assistant"
// (fr: "assistant tailleur") because SeamFlow genuinely ships an AI assistant
// for tailors. The phrase is placed in the title tag, meta description, H1/H2s,
// FAQ questions and the /tailor-assistant page — not sprinkled through body
// copy. Keep it that way: repetition past the point of usefulness reads as spam
// to both readers and search engines.
// ============================================================================

export type Lang = 'en' | 'fr' | 'pt';

/**
 * Every language the site publishes, English first.
 *
 * English is the UNPREFIXED default (`/privacy`); every other language lives
 * under its own code (`/fr/privacy`, `/pt/privacy`). The helpers below derive
 * their behaviour from this array, so adding a language means adding a code
 * here and a route folder — no prefix logic to update.
 */
export const LANGS: Lang[] = ['en', 'fr', 'pt'];

/** The default language, which carries no URL prefix. */
export const DEFAULT_LANG: Lang = 'en';

/** Languages that DO carry a prefix — i.e. everything except the default. */
const PREFIXED = LANGS.filter((l) => l !== DEFAULT_LANG);

/** Coerce an unknown value into a supported language (English default). */
export function resolveLang(v: string | string[] | undefined): Lang {
  const s = Array.isArray(v) ? v[0] : v;
  return LANGS.find((l) => l === s) ?? DEFAULT_LANG;
}

/**
 * Strip a leading language prefix so a path can be re-prefixed for any
 * language. `/fr/privacy` → `/privacy`, `/pt` → `/`, `/privacy` → `/privacy`.
 */
export function stripLang(path: string): string {
  const [base = '/', hash] = path.split('#');
  let bare = base;
  for (const code of PREFIXED) {
    if (bare === `/${code}`) {
      bare = '/';
      break;
    }
    if (bare.startsWith(`/${code}/`)) {
      bare = bare.slice(code.length + 1);
      break;
    }
  }
  return `${bare || '/'}${hash ? `#${hash}` : ''}`;
}

/**
 * Prefix a language-neutral path for the given language, preserving hash
 * anchors. English is the un-prefixed default; the rest live under their code.
 *
 * French used to be a `?lang=fr` query on the same URL, which meant Google saw
 * one page in two languages and indexed neither cleanly. Distinct paths plus
 * the hreflang tags in lib/seo.ts is what makes each translation crawlable.
 *
 * Accepts an already-prefixed path (it strips first), so passing a live
 * `usePathname()` through is safe.
 */
export function withLang(path: string, lang: Lang): string {
  const [base = '/', hash] = stripLang(path).split('#');
  const p =
    lang === DEFAULT_LANG ? base : base === '/' ? `/${lang}` : `/${lang}${base}`;
  return `${p}${hash ? `#${hash}` : ''}`;
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
    // Search-facing strings. Deliberately plainer and more literal than the
    // on-page hero copy — a title tag has to say what the product *is*.
    seo: {
      title:
        'SeamFlow: the AI tailor assistant for measurements, orders & invoices',
      description:
        'SeamFlow is a tailor assistant app for tailors and fashion designers. Scan measurements from paper, track orders, send invoices, and ask an AI assistant about your business. Bilingual, offline-first, free in early access.',
      keywords: [
        'tailor assistant',
        'tailor assistant app',
        'AI tailor assistant',
        'tailoring assistant',
        'assistant for tailors',
        'tailor app',
        'tailoring software',
        'measurement app for tailors',
        'tailor order management',
        'tailoring business app',
        'fashion designer app',
        'measurement scanner',
        'tailor invoicing',
        'atelier management',
      ],
    },
    nav: {
      features: 'Features',
      assistant: 'AI assistant',
      how: 'How it works',
      faq: 'FAQ',
      useOnBrowser: 'Use on browser',
    },
    hero: {
      eyebrow: 'The AI tailor assistant for workshops',
      title: 'Your whole workshop, in one calm place.',
      subtitle:
        'SeamFlow is the tailor assistant that keeps your clients, measurements, orders and deadlines together, with an AI assistant that answers questions about your business and files the work for you.',
      ctaPrimary: 'Use on browser',
      ctaSecondary: 'See how it works',
      note: 'Works offline · English & French · Free in early access',
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
        'One place for every client, order, fitting and invoice. An assistant you can simply ask, reminders before every deadline, a shareable order page, and it all keeps working even when the network doesn’t.',
    },
    features: {
      heading: 'Everything the craft needs',
      subheading:
        'A tailor assistant purpose-built for how tailors actually work, not a generic to-do list.',
      items: [
        {
          key: 'assistant',
          title: 'AI assistant, by text or voice',
          body: 'Ask "what’s due this week?" or "who owes me?" and get a straight answer. Tell it to create a client, an order or an invoice and it prepares the record, shows you exactly what will be saved, and waits for your confirmation.',
        },
        {
          key: 'scan',
          title: 'Scan measurements from paper',
          body: 'Photograph a filled measurement sheet and SeamFlow reads the numbers into a measurement set. Photograph a blank booklet page and it becomes a reusable template. You check every value before it saves.',
        },
        {
          key: 'clients',
          title: 'Clients & measurements',
          body: 'Save each client once, with as many measurement sets as they need. Build your own measurement templates per garment, and reuse a client’s saved measurements on the next order.',
        },
        {
          key: 'orders',
          title: 'Orders with status tracking',
          body: 'Registered → in progress → fitting → delivered. Everyone knows exactly where the work stands.',
        },
        {
          key: 'invoices',
          title: 'Invoices & deposits',
          body: 'Turn any order into an invoice: workmanship, fabric and extras as line items, the deposit recorded, the balance worked out for you. Share it as a link or a PDF.',
        },
        {
          key: 'calendar',
          title: 'Calendar & reminders',
          body: 'See every fitting and delivery laid out by day, and get a gentle nudge before each one. Deadlines stop sneaking up on you.',
        },
        {
          key: 'groups',
          title: 'Group orders',
          body: 'Wedding parties, aso-ebi, uniforms: coordinate a whole group with shared fabric and per-member measurements.',
        },
        {
          key: 'design',
          title: 'Design Studio',
          body: 'Collect inspiration and fabric photos into a mood board, open any image full-screen, and let AI turn a reference photo into clean, structured design notes.',
        },
        {
          key: 'share',
          title: 'Share with clients',
          body: 'Send a link and your client sees their order, status, fitting date and photos, with no app to install.',
        },
        {
          key: 'fabric',
          title: 'Fabric library',
          body: 'Photograph your stock, track supplier and cost per meter, and attach fabric straight to an order.',
        },
        {
          key: 'devices',
          title: 'Phone, tablet or browser',
          body: 'The Android app on the shop floor, the same SeamFlow in a browser on a laptop. Install it to your home screen and it behaves like an app.',
        },
        {
          key: 'offline',
          title: 'Bilingual & offline',
          body: 'Full English and French. Take orders and edit on the spot even with no signal. It syncs when you’re back.',
        },
      ] as Feature[],
    },
    // Assistant spotlight band on the landing page (links to /tailor-assistant).
    spotlight: {
      eyebrow: 'New',
      title: 'A tailor assistant you can actually talk to.',
      body: 'Most tailoring software makes you go and find the answer. SeamFlow’s assistant knows your clients, orders, measurements and invoices, so you can just ask, in English or French, by typing or by speaking.',
      examples: [
        'What’s due this week?',
        'Who still owes me money?',
        'How’s business this month?',
        'Create an order for Amina, agbada, due the 20th.',
      ],
      cta: 'See what the assistant can do',
    },
    steps: {
      eyebrow: 'Three steps',
      heading: 'Up and running in minutes',
      items: [
        {
          title: 'Add a client',
          body: 'Name, phone, measurements: type them, import from your contacts, or scan a filled measurement sheet with the camera.',
        },
        {
          title: 'Create an order',
          body: 'Pick a garment, set the delivery date, add design notes and reference photos. Or just tell the assistant and confirm.',
        },
        {
          title: 'Get reminded, get paid',
          body: 'SeamFlow nudges you before every fitting and deadline, keeps the client in the loop, and turns the finished order into an invoice.',
        },
      ] as Step[],
    },
    vision: {
      eyebrow: 'Why we built it',
      title: 'The business companion for a craft that deserves one.',
      body: 'Independent tailors run real businesses on notebooks and memory. SeamFlow gives that craft modern tools: an assistant in your pocket, bilingual from day one, built offline-first, and growing toward every language and market where great clothes are still made by hand.',
      photoAlt:
        'A tailor’s workbench: an old Singer sewing machine, shears and dark cloth, in a working shop.',
    },
    gallery: {
      heading: 'A look inside',
      subheading:
        'The real app, on a real phone. Light or dark, it follows whatever your device is set to.',
      altPhone:
        'SeamFlow home screen on an Android phone in dark mode, showing orders, clients, groups, calendar, templates, fabrics, Design Studio and the assistant.',
      altTablet:
        'SeamFlow home screen on a tablet in light mode, with the same tiles laid out across a wider screen.',
    },
    faq: {
      heading: 'Questions, answered',
      items: [
        {
          q: 'Is there an AI assistant for tailors inside SeamFlow?',
          a: 'Yes. SeamFlow includes a built-in AI tailor assistant you can type to or speak to. It answers questions about your own business: what’s due, who owes you, how the month is going. It can also create clients, orders, measurements and invoices for you. It always shows you exactly what it’s about to save and waits for your confirmation first.',
          href: '/tailor-assistant',
          linkLabel: 'More about the assistant',
        },
        {
          q: 'Can I scan measurements from paper instead of typing them?',
          a: 'Yes. Take a straight-on photo of a filled measurement sheet and SeamFlow reads the labels and numbers into a measurement set. Photograph a blank page from your measurement booklet and it becomes a reusable template. Nothing is saved until you’ve checked every line against the photo.',
        },
        {
          q: 'Can I send invoices to clients?',
          a: 'Yes. Any order can become an invoice with separate lines for workmanship, fabric and extras. Record a deposit and SeamFlow works out the balance due, then share the invoice as a link or a PDF.',
        },
        {
          q: 'Does SeamFlow work on a computer, or only on a phone?',
          a: 'Both. There’s an Android app for the shop floor, and the same SeamFlow runs in any modern browser on a laptop or desktop. You can install it to your home screen or desktop and it behaves like a native app.',
        },
        {
          q: 'How much does it cost?',
          a: 'SeamFlow is in early access. Core features are free while we build; any paid plan will be clearly optional.',
        },
        {
          q: 'What makes SeamFlow different from other tailor assistant apps?',
          a: 'Three things: it works with no signal, so the workshop never stops; it’s fully bilingual in English and French rather than translated as an afterthought; and its assistant is wired into your real data, so it answers about your orders and clients instead of giving generic advice.',
        },
        {
          q: 'What languages does it support?',
          a: 'English, French and Portuguese today, fully. Every screen, not just the menus. More on the way.',
        },
        {
          q: 'Does it work offline?',
          a: 'Yes. You can browse, take orders and make edits with no connection; everything syncs when you’re back online.',
        },
        {
          q: 'Do my clients need to install anything?',
          a: 'No. You share a link and they view their order or invoice in any browser.',
        },
        {
          q: 'Can I lock the app so nobody else can open it?',
          a: 'Yes. You can set a four-digit PIN, and SeamFlow locks itself after a few minutes in the background, so your client list stays yours even if someone else picks up the phone.',
        },
        {
          q: 'Is my data private?',
          a: 'Your data is yours; we don’t sell it. Our Privacy Policy spells out exactly what’s stored and your rights.',
          href: '/privacy',
          linkLabel: 'Read the Privacy Policy',
        },
        {
          q: 'Which devices does it run on?',
          a: 'Android phones and tablets today, any browser on laptop or desktop, and iOS soon.',
        },
      ] as Faq[],
    },
    cta: {
      title: 'Bring your workshop together.',
      body: 'Join the tailors making SeamFlow their daily assistant.',
    },
    footer: {
      tagline: 'The AI tailor assistant and calm home for your tailoring business.',
      product: 'Product',
      legal: 'Legal',
      contact: 'Contact',
      links: {
        features: 'Features',
        assistant: 'AI tailor assistant',
        compare: 'How we compare',
        how: 'How it works',
        faq: 'FAQ',
        privacy: 'Privacy Policy',
        terms: 'Terms',
        support: 'Support',
        deleteAccount: 'Delete account',
      },
      email: 'contactseamflow@gmail.com',
      phone: '+237 670 15 19 73',
      rights: '© {year} SeamFlow. All rights reserved.',
      madeWith: 'Made for tailors, everywhere.',
    },
    legal: {
      lastUpdated: 'Last updated',
      backToHome: 'Back to home',
      privacyTitle: 'Privacy Policy',
      termsTitle: 'Terms of Service',
      supportTitle: 'Support',
    },
    deleteAccount: {
      metaTitle: 'Delete your SeamFlow account',
      metaDescription:
        'How to delete your SeamFlow account and everything stored with it — from inside the app, or by writing to us if you no longer have it installed.',
      title: 'Delete your account',
      intro:
        'You can close your SeamFlow account at any time, and take a copy of your records with you first.',

      inAppHeading: 'From inside the app (fastest)',
      inAppBody:
        'If you can still sign in, this is the quickest route and you stay in control of it throughout.',
      inAppStep1: 'Open SeamFlow and go to Settings.',
      inAppStep2: 'Under Account, tap “Delete my account”.',
      inAppStep3:
        'Download a copy of your data if you want one, confirm it is you, and confirm the deletion.',

      emailHeading: 'If you no longer have the app',
      emailBody:
        'Write to us from the email address on the account and we will start the same process for you. We may ask a question or two to confirm the account is yours — we will never ask for your password.',
      emailCta: 'Email us to delete my account',
      mailSubject: 'Please delete my SeamFlow account',
      mailBody:
        'Hello,\n\nPlease delete my SeamFlow account and the data stored with it.\n\nThe email address on my account is: \n\nThank you.',

      whatHappensHeading: 'What happens',
      whatHappensIntro:
        'Deletion removes your account and the records attached to it. Here is exactly what that covers.',

      erasedHeading: 'Erased',
      erased1: 'Your profile and sign-in — you will not be able to log back in',
      erased2: 'Your clients and their measurements, orders, group orders and invoices',
      erased3: 'Every photo you uploaded, including your public page',
      erased4: 'Your requests, offers and saved measurements',

      keptHeading: 'Kept',
      kept1:
        'Messages you sent stay in the other person’s conversation, with your name and their contents removed.',
      kept2:
        'Anonymous records with nothing personal in them, where they are needed to keep the app working for others.',

      graceHeading: 'You have 30 days to change your mind',
      graceBody:
        'Nothing is erased immediately. Your public page disappears straight away and notifications stop, but your records stay untouched for 30 days — sign in during that time and tap “Keep my account” to cancel. After 30 days it is permanent and we cannot recover it.',

      privacyNote: 'For more on what we store and why, see our',
    },

    support: {
      intro: 'Need a hand? We’re happy to help.',
      emailHeading: 'Email us',
      emailBody: 'Write to us and we’ll get back to you within a couple of days.',
      faqHeading: 'Common questions',
      faqBody: 'Most answers live on our FAQ.',
      faqLink: 'Read the FAQ',
    },

    // ── /tailor-assistant — the dedicated keyword landing page ──────────────
    assistantPage: {
      metaTitle: 'AI tailor assistant: ask about your workshop, by text or voice | SeamFlow',
      metaDescription:
        'SeamFlow’s AI tailor assistant answers questions about your own orders, clients and invoices, and creates records for you on confirmation. Type or speak, in English or French. Free in early access.',
      eyebrow: 'Inside SeamFlow',
      title: 'The AI tailor assistant for your workshop.',
      subtitle:
        'Every tailoring app can store your orders. SeamFlow’s assistant can answer questions about them, and do the filing for you, in your own language, by typing or by speaking.',
      askHeading: 'Ask it about your business',
      askBody:
        'The assistant reads your live data before it answers, so these aren’t canned replies. They’re about your workshop, today.',
      askItems: [
        'What’s due this week?',
        'Who still owes me money?',
        'How’s business this month?',
        'What did I last make for Amina?',
        'Which orders are waiting on a fitting?',
        'How many uniforms are left in the school group order?',
      ],
      doHeading: 'Tell it what to do',
      doBody:
        'The assistant can create and update records, but it never writes anything silently. It builds the change, shows you a confirmation card with every field spelled out, and nothing is saved until you tap Confirm.',
      doItems: [
        'Create a client called Amina, number 6xx xx xx xx.',
        'New order for Amina, agbada, due the 20th.',
        'Move order #14 to fitting.',
        'Save these measurements against Joseph.',
        'Draft an invoice for the wedding order.',
        'Send me the share link for that order.',
      ],
      pillars: [
        {
          key: 'voice',
          title: 'Hands-free when your hands are busy',
          body: 'Speak to it while you’re cutting or pinning, and have replies read back to you. Clear indicators show when it’s listening and when it’s speaking, so you always know what’s happening.',
        },
        {
          key: 'shield',
          title: 'It asks before it saves',
          body: 'Any action that changes your data comes as a confirmation card listing exactly what will be written. Read it, change your mind, or confirm. Nothing happens behind your back.',
        },
        {
          key: 'globe',
          title: 'Answers in your language',
          body: 'Ask in English or French and it replies in the same language. It understands the vocabulary of the trade in both: poitrine and chest are the same measurement to it.',
        },
        {
          key: 'offline',
          title: 'Private by default',
          body: 'Your conversation lives on your device, not on our servers. We store none of it. Older messages drop away as the thread grows, and you can wipe it whenever you like. The assistant only ever reads your own workshop’s data.',
        },
      ] as Feature[],
      ctaTitle: 'Put an assistant in your workshop.',
      ctaBody: 'Free while SeamFlow is in early access.',
      backToFeatures: 'See all features',
    },

    // ── /alternatives/tailor-assist ────────────────────────────────────────
    // An honest comparison page. The rule for this page: every claim about the
    // other product is checkable from their public site, every claim about ours
    // is a feature that ships, and the section on where they beat us is real
    // and specific. A comparison page that only flatters its author convinces
    // nobody and ages badly.
    alternativesPage: {
      metaTitle: 'A Tailor Assist alternative: SeamFlow, compared honestly | SeamFlow',
      metaDescription:
        'Comparing SeamFlow and Tailor Assist? Both are free, offline-first apps for tailors. SeamFlow adds an AI tailor assistant you can talk to, measurement scanning from paper, and a design studio. An honest look at where each one wins.',
      eyebrow: 'Comparison',
      title: 'Looking for a Tailor Assist alternative?',
      subtitle:
        'Tailor Assist and SeamFlow set out to solve the same problem: a tailoring business run on notebooks and memory. They go about it differently. Here is a straight comparison, including the parts where we come off worse.',

      disclosureTitle: 'Who wrote this',
      disclosureBody:
        'We did. We make SeamFlow, so read this the way you would read any comparison written by one of the two sides. What we can promise is accuracy: everything below about Tailor Assist comes from their own public website, and everything about SeamFlow is a feature you can use today, not a roadmap item. Try both; they are both free.',
      updatedLabel: 'Compared against publicly available information in {date}.',

      strengthsHeading: 'Where SeamFlow is different',
      strengthsBody:
        'These are the things that made us build another tailoring app rather than use an existing one.',
      strengths: [
        {
          key: 'assistant',
          title: 'An assistant you can talk to',
          body: 'SeamFlow has a built-in AI assistant wired into your own data. Ask "what’s due this week?" or "who owes me?" and it answers about your workshop. Tell it to create an order and it prepares the record, shows you a confirmation card, and waits. You can type or speak, in English or French. As far as we can tell from their site, Tailor Assist has no equivalent.',
        },
        {
          key: 'scan',
          title: 'Measurements straight off the paper',
          body: 'Photograph a filled measurement sheet and SeamFlow reads the labels and numbers into a measurement set for you to check. Photograph a blank booklet page and it becomes a reusable template. If you have years of paper records, this is the difference between migrating in an evening and never migrating at all.',
        },
        {
          key: 'design',
          title: 'A design studio, not just a photo field',
          body: 'Collect style and fabric references into a mood board, open any image full-screen, and let AI turn a reference photo into structured garment notes (cut, neckline, sleeve, finish) that you edit before saving. Then attach it to the order it belongs to.',
        },
        {
          key: 'groups',
          title: 'Group orders as a first-class thing',
          body: 'Weddings, aso-ebi and uniforms are one order with an owner, a shared fabric and per-member measurements, not a dozen loose orders you have to remember belong together.',
        },
      ] as Feature[],

      theirsHeading: 'Where Tailor Assist may suit you better',
      theirsBody:
        'Genuinely. If any of these is how your shop runs, they are the better tool today, and we would rather tell you now than waste your evening.',
      theirs: [
        {
          title: 'You have staff',
          body: 'Tailor Assist offers staff accounts, role-based access and task assignment across a production pipeline. SeamFlow today is built for one tailor and their own records. There is no way to invite an employee or hand a job to someone else.',
        },
        {
          title: 'You need Arabic or Spanish',
          body: 'They list English, French, Arabic and Spanish. SeamFlow is English, French and Portuguese. Ours are complete rather than partial translations, but if Arabic or Spanish is the language your clients read, they have it today and we do not.',
        },
        {
          title: 'You want payment tracking',
          body: 'They advertise mobile money payment tracking. SeamFlow records a deposit and works out the balance on an invoice, but it does not connect to a payment provider. You reconcile money yourself. Payments are on our roadmap, and a roadmap is not a feature.',
        },
        {
          title: 'You want dashboards and reports',
          body: 'They offer business analytics and reporting screens. SeamFlow has no reporting section; the closest thing is asking the assistant how business is going, which is a good answer to a question but not a chart you can study.',
        },
      ],

      sharedHeading: 'Where the two are much the same',
      sharedBody: 'On the fundamentals, honestly, you would be fine either way.',
      shared: [
        'Free to use as an independent tailor',
        'Works with no signal, syncs when the network returns',
        'Clients, measurements and order status in one place',
        'Invoices you can send to a client',
        'Share to WhatsApp without the client installing anything',
        'Runs on Android, and in a browser',
      ],

      ctaTitle: 'Try it for an evening.',
      ctaBody: 'Free while SeamFlow is in early access. Bring one client and one order, and see how it feels.',
      backToFeatures: 'See all features',
    },
  },

  fr: {
    seo: {
      title:
        'SeamFlow : l’assistant tailleur IA pour mesures, commandes et factures',
      description:
        'SeamFlow est une application d’assistant tailleur pour tailleurs et créateurs de mode. Scannez les mesures sur papier, suivez les commandes, envoyez des factures et interrogez un assistant IA sur votre activité. Bilingue, hors ligne, gratuit en accès anticipé.',
      keywords: [
        'assistant tailleur',
        'application assistant tailleur',
        'assistant tailleur IA',
        'assistant de couture',
        'assistant pour tailleurs',
        'application tailleur',
        'logiciel de couture',
        'application de mesures tailleur',
        'gestion commandes tailleur',
        'application atelier couture',
        'application créateur de mode',
        'scanner de mesures',
        'facturation tailleur',
        'gestion d’atelier',
      ],
    },
    nav: {
      features: 'Fonctionnalités',
      assistant: 'Assistant IA',
      how: 'Comment ça marche',
      faq: 'FAQ',
      useOnBrowser: 'Utiliser sur navigateur',
    },
    hero: {
      eyebrow: 'L’assistant tailleur IA pour les ateliers',
      title: 'Tout votre atelier, en un seul endroit serein.',
      subtitle:
        'SeamFlow est l’assistant tailleur qui réunit vos clients, mesures, commandes et échéances, avec un assistant IA qui répond à vos questions et enregistre le travail à votre place.',
      ctaPrimary: 'Utiliser sur navigateur',
      ctaSecondary: 'Voir comment ça marche',
      note: 'Fonctionne hors ligne · Français et anglais · Gratuit en accès anticipé',
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
        'Un seul endroit pour chaque client, commande, essayage et facture. Un assistant à qui il suffit de demander, des rappels avant chaque échéance, une page de commande partageable, et tout continue de fonctionner même sans réseau.',
    },
    features: {
      heading: 'Tout ce dont le métier a besoin',
      subheading:
        'Un assistant tailleur pensé pour la façon dont les tailleurs travaillent vraiment, pas une simple liste de tâches.',
      items: [
        {
          key: 'assistant',
          title: 'Assistant IA, à l’écrit ou à la voix',
          body: 'Demandez « qu’est-ce qui est dû cette semaine ? » ou « qui me doit de l’argent ? » et obtenez une réponse claire. Dites-lui de créer un client, une commande ou une facture : il prépare la fiche, vous montre exactement ce qui sera enregistré, et attend votre confirmation.',
        },
        {
          key: 'scan',
          title: 'Scannez les mesures sur papier',
          body: 'Photographiez une fiche de mesures remplie et SeamFlow en lit les nombres pour créer un jeu de mesures. Photographiez une page vierge de votre carnet et elle devient un modèle réutilisable. Vous vérifiez chaque valeur avant l’enregistrement.',
        },
        {
          key: 'clients',
          title: 'Clients et mesures',
          body: 'Enregistrez chaque client une fois, avec autant de jeux de mesures qu’il faut. Créez vos propres modèles de mesures par vêtement, et réutilisez les mesures d’un client à la commande suivante.',
        },
        {
          key: 'orders',
          title: 'Commandes avec suivi',
          body: 'Enregistrée → en cours → essayage → livrée. Chacun sait exactement où en est le travail.',
        },
        {
          key: 'invoices',
          title: 'Factures et acomptes',
          body: 'Transformez une commande en facture : façon, tissu et extras en lignes distinctes, l’acompte enregistré, le solde calculé pour vous. Partagez-la en lien ou en PDF.',
        },
        {
          key: 'calendar',
          title: 'Calendrier et rappels',
          body: 'Voyez chaque essayage et livraison jour par jour, et recevez un rappel avant chacun. Les échéances ne vous surprennent plus.',
        },
        {
          key: 'groups',
          title: 'Commandes de groupe',
          body: 'Cortèges, aso-ebi, uniformes : coordonnez tout un groupe avec tissu partagé et mesures par membre.',
        },
        {
          key: 'design',
          title: 'Design Studio',
          body: 'Rassemblez inspirations et photos de tissu en planche d’ambiance, ouvrez chaque image en plein écran, et laissez l’IA transformer une photo de référence en notes de conception claires.',
        },
        {
          key: 'share',
          title: 'Partage avec les clients',
          body: 'Envoyez un lien : votre client voit sa commande, son statut, la date d’essayage et les photos, sans rien installer.',
        },
        {
          key: 'fabric',
          title: 'Bibliothèque de tissus',
          body: 'Photographiez votre stock, suivez le fournisseur et le coût au mètre, et associez un tissu directement à une commande.',
        },
        {
          key: 'devices',
          title: 'Téléphone, tablette ou navigateur',
          body: 'L’app Android à l’atelier, le même SeamFlow dans un navigateur sur ordinateur. Installez-le sur votre écran d’accueil et il se comporte comme une vraie app.',
        },
        {
          key: 'offline',
          title: 'Bilingue et hors ligne',
          body: 'Français et anglais complets. Prenez des commandes et modifiez sur place, même sans signal. La synchro se fait au retour du réseau.',
        },
      ] as Feature[],
    },
    spotlight: {
      eyebrow: 'Nouveau',
      title: 'Un assistant tailleur à qui vous pouvez vraiment parler.',
      body: 'La plupart des logiciels de couture vous obligent à aller chercher la réponse. L’assistant de SeamFlow connaît vos clients, commandes, mesures et factures, il suffit de demander, en français ou en anglais, à l’écrit ou à la voix.',
      examples: [
        'Qu’est-ce qui est dû cette semaine ?',
        'Qui me doit encore de l’argent ?',
        'Comment vont les affaires ce mois-ci ?',
        'Crée une commande pour Amina, agbada, pour le 20.',
      ],
      cta: 'Voir ce que l’assistant sait faire',
    },
    steps: {
      eyebrow: 'Trois étapes',
      heading: 'Opérationnel en quelques minutes',
      items: [
        {
          title: 'Ajoutez un client',
          body: 'Nom, téléphone, mesures : saisissez-les, importez depuis vos contacts, ou scannez une fiche de mesures remplie avec l’appareil photo.',
        },
        {
          title: 'Créez une commande',
          body: 'Choisissez un vêtement, fixez la date de livraison, ajoutez des notes et des photos de référence. Ou dites-le simplement à l’assistant et confirmez.',
        },
        {
          title: 'Soyez rappelé, soyez payé',
          body: 'SeamFlow vous prévient avant chaque essayage et échéance, tient le client informé, et transforme la commande terminée en facture.',
        },
      ] as Step[],
    },
    vision: {
      eyebrow: 'Pourquoi nous l’avons créé',
      title: 'Le compagnon d’affaires d’un métier qui le mérite.',
      body: 'Les tailleurs indépendants font tourner de vraies entreprises avec un carnet et leur mémoire. SeamFlow offre à ce métier des outils modernes : un assistant dans la poche, bilingue dès le départ, pensé hors-ligne, et s’ouvrant à chaque langue et marché où l’on crée encore de beaux vêtements à la main.',
      photoAlt:
        'L’établi d’un tailleur : une vieille machine à coudre Singer, des ciseaux et du tissu sombre, dans un atelier en activité.',
    },
    gallery: {
      heading: 'Un aperçu de l’intérieur',
      subheading:
        'La vraie application, sur un vrai téléphone. Clair ou sombre, elle suit le réglage de votre appareil.',
      altPhone:
        'Écran d’accueil de SeamFlow sur un téléphone Android en mode sombre, avec les commandes, clients, groupes, calendrier, modèles, tissus, le studio de création et l’assistant.',
      altTablet:
        'Écran d’accueil de SeamFlow sur une tablette en mode clair, avec les mêmes tuiles réparties sur un écran plus large.',
    },
    faq: {
      heading: 'Vos questions, nos réponses',
      items: [
        {
          q: 'Y a-t-il un assistant IA pour tailleurs dans SeamFlow ?',
          a: 'Oui. SeamFlow intègre un assistant tailleur IA auquel vous pouvez écrire ou parler. Il répond aux questions sur votre propre activité : ce qui est dû, qui vous doit de l’argent, comment se passe le mois. Il peut aussi créer clients, commandes, mesures et factures. Il vous montre toujours exactement ce qu’il va enregistrer et attend votre confirmation.',
          href: '/tailor-assistant',
          linkLabel: 'En savoir plus sur l’assistant',
        },
        {
          q: 'Puis-je scanner les mesures depuis le papier au lieu de les saisir ?',
          a: 'Oui. Prenez une photo bien de face d’une fiche de mesures remplie et SeamFlow en lit les libellés et les nombres pour créer un jeu de mesures. Photographiez une page vierge de votre carnet et elle devient un modèle réutilisable. Rien n’est enregistré avant que vous ayez vérifié chaque ligne avec la photo.',
        },
        {
          q: 'Puis-je envoyer des factures à mes clients ?',
          a: 'Oui. Toute commande peut devenir une facture avec des lignes distinctes pour la façon, le tissu et les extras. Enregistrez un acompte et SeamFlow calcule le solde dû, puis partagez la facture en lien ou en PDF.',
        },
        {
          q: 'SeamFlow fonctionne-t-il sur ordinateur, ou seulement sur téléphone ?',
          a: 'Les deux. Il y a une app Android pour l’atelier, et le même SeamFlow tourne dans n’importe quel navigateur moderne sur ordinateur portable ou de bureau. Vous pouvez l’installer sur votre écran d’accueil ou votre bureau et il se comporte comme une app native.',
        },
        {
          q: 'Combien ça coûte ?',
          a: 'SeamFlow est en accès anticipé. Les fonctions essentielles sont gratuites pendant que nous construisons ; toute offre payante restera clairement facultative.',
        },
        {
          q: 'Qu’est-ce qui distingue SeamFlow des autres applications d’assistant tailleur ?',
          a: 'Trois choses : il fonctionne sans réseau, donc l’atelier ne s’arrête jamais ; il est réellement bilingue français-anglais, pas traduit après coup ; et son assistant est branché sur vos vraies données, donc il répond sur vos commandes et vos clients au lieu de donner des conseils génériques.',
        },
        {
          q: 'Quelles langues sont prises en charge ?',
          a: 'Le français, l’anglais et le portugais aujourd’hui, entièrement. Chaque écran, pas seulement les menus. D’autres à venir.',
        },
        {
          q: 'Est-ce que ça marche hors ligne ?',
          a: 'Oui. Vous pouvez consulter, prendre des commandes et modifier sans connexion ; tout se synchronise au retour du réseau.',
        },
        {
          q: 'Mes clients doivent-ils installer quelque chose ?',
          a: 'Non. Vous partagez un lien et ils voient leur commande ou leur facture dans n’importe quel navigateur.',
        },
        {
          q: 'Puis-je verrouiller l’app pour que personne d’autre ne l’ouvre ?',
          a: 'Oui. Vous pouvez définir un code PIN à quatre chiffres, et SeamFlow se verrouille après quelques minutes en arrière-plan, pour que votre fichier client reste le vôtre même si quelqu’un prend votre téléphone.',
        },
        {
          q: 'Mes données sont-elles privées ?',
          a: 'Vos données vous appartiennent ; nous ne les vendons pas. Notre Politique de confidentialité précise exactement ce qui est stocké et vos droits.',
          href: '/privacy',
          linkLabel: 'Lire la Politique de confidentialité',
        },
        {
          q: 'Sur quels appareils ?',
          a: 'Téléphones et tablettes Android aujourd’hui, n’importe quel navigateur sur ordinateur, et iOS bientôt.',
        },
      ] as Faq[],
    },
    cta: {
      title: 'Réunissez votre atelier.',
      body: 'Rejoignez les tailleurs qui font de SeamFlow leur assistant quotidien.',
    },
    footer: {
      tagline: 'L’assistant tailleur IA et le foyer serein de votre activité de couture.',
      product: 'Produit',
      legal: 'Légal',
      contact: 'Contact',
      links: {
        features: 'Fonctionnalités',
        assistant: 'Assistant tailleur IA',
        compare: 'Comparatif',
        how: 'Comment ça marche',
        faq: 'FAQ',
        privacy: 'Politique de confidentialité',
        terms: 'Conditions',
        support: 'Support',
        deleteAccount: 'Supprimer un compte',
      },
      email: 'contactseamflow@gmail.com',
      phone: '+237 670 15 19 73',
      rights: '© {year} SeamFlow. Tous droits réservés.',
      madeWith: 'Conçu pour les tailleurs, partout.',
    },
    legal: {
      lastUpdated: 'Dernière mise à jour',
      backToHome: 'Retour à l’accueil',
      privacyTitle: 'Politique de confidentialité',
      termsTitle: 'Conditions d’utilisation',
      supportTitle: 'Support',
    },
    deleteAccount: {
      metaTitle: 'Supprimer votre compte SeamFlow',
      metaDescription:
        'Comment supprimer votre compte SeamFlow et toutes les données associées — depuis l’application, ou en nous écrivant si vous ne l’avez plus installée.',
      title: 'Supprimer votre compte',
      intro:
        'Vous pouvez fermer votre compte SeamFlow à tout moment, et récupérer une copie de vos dossiers avant.',

      inAppHeading: 'Depuis l’application (le plus rapide)',
      inAppBody:
        'Si vous pouvez encore vous connecter, c’est la voie la plus rapide et vous gardez la main du début à la fin.',
      inAppStep1: 'Ouvrez SeamFlow et allez dans Paramètres.',
      inAppStep2: 'Dans Compte, touchez « Supprimer mon compte ».',
      inAppStep3:
        'Téléchargez une copie de vos données si vous le souhaitez, confirmez votre identité, puis confirmez la suppression.',

      emailHeading: 'Si vous n’avez plus l’application',
      emailBody:
        'Écrivez-nous depuis l’adresse e-mail du compte et nous lancerons la même procédure. Nous pourrons poser une ou deux questions pour vérifier que le compte est bien le vôtre — nous ne demanderons jamais votre mot de passe.',
      emailCta: 'Nous écrire pour supprimer mon compte',
      mailSubject: 'Merci de supprimer mon compte SeamFlow',
      mailBody:
        'Bonjour,\n\nMerci de supprimer mon compte SeamFlow et les données associées.\n\nL’adresse e-mail de mon compte est : \n\nMerci.',

      whatHappensHeading: 'Ce qui se passe',
      whatHappensIntro:
        'La suppression efface votre compte et les dossiers qui y sont rattachés. Voici précisément ce que cela couvre.',

      erasedHeading: 'Effacé',
      erased1: 'Votre profil et votre connexion — vous ne pourrez plus vous reconnecter',
      erased2: 'Vos clients et leurs mesures, commandes, commandes de groupe et factures',
      erased3: 'Toutes les photos ajoutées, y compris votre page publique',
      erased4: 'Vos demandes, les offres reçues et vos mesures enregistrées',

      keptHeading: 'Conservé',
      kept1:
        'Les messages que vous avez envoyés restent dans la conversation de l’autre personne, sans votre nom ni leur contenu.',
      kept2:
        'Des enregistrements anonymes, sans rien de personnel, lorsqu’ils sont nécessaires au bon fonctionnement de l’application pour les autres.',

      graceHeading: 'Vous avez 30 jours pour changer d’avis',
      graceBody:
        'Rien n’est effacé immédiatement. Votre page publique disparaît aussitôt et les notifications s’arrêtent, mais vos dossiers restent intacts pendant 30 jours — connectez-vous durant cette période et touchez « Garder mon compte » pour annuler. Passé 30 jours, c’est définitif et irrécupérable.',

      privacyNote: 'Pour en savoir plus sur ce que nous conservons et pourquoi, consultez notre',
    },

    support: {
      intro: 'Besoin d’aide ? Nous sommes là.',
      emailHeading: 'Écrivez-nous',
      emailBody: 'Envoyez-nous un message, nous répondons sous quelques jours.',
      faqHeading: 'Questions fréquentes',
      faqBody: 'La plupart des réponses sont dans notre FAQ.',
      faqLink: 'Lire la FAQ',
    },

    assistantPage: {
      metaTitle:
        'Assistant tailleur IA : interrogez votre atelier, à l’écrit ou à la voix | SeamFlow',
      metaDescription:
        'L’assistant tailleur IA de SeamFlow répond aux questions sur vos propres commandes, clients et factures, et crée les fiches pour vous après confirmation. Écrivez ou parlez, en français ou en anglais. Gratuit en accès anticipé.',
      eyebrow: 'Dans SeamFlow',
      title: 'L’assistant tailleur IA de votre atelier.',
      subtitle:
        'Toutes les applications savent stocker vos commandes. L’assistant de SeamFlow sait y répondre, et fait le classement à votre place, dans votre langue, à l’écrit ou à la voix.',
      askHeading: 'Interrogez-le sur votre activité',
      askBody:
        'L’assistant lit vos données en direct avant de répondre : ce ne sont pas des réponses toutes faites, elles parlent de votre atelier, aujourd’hui.',
      askItems: [
        'Qu’est-ce qui est dû cette semaine ?',
        'Qui me doit encore de l’argent ?',
        'Comment vont les affaires ce mois-ci ?',
        'Qu’ai-je cousu en dernier pour Amina ?',
        'Quelles commandes attendent un essayage ?',
        'Combien d’uniformes reste-t-il dans la commande de groupe de l’école ?',
      ],
      doHeading: 'Dites-lui quoi faire',
      doBody:
        'L’assistant peut créer et modifier des fiches, mais il n’écrit jamais en silence. Il prépare la modification, affiche une carte de confirmation détaillant chaque champ, et rien n’est enregistré tant que vous n’avez pas touché Confirmer.',
      doItems: [
        'Crée une cliente Amina, numéro 6xx xx xx xx.',
        'Nouvelle commande pour Amina, agbada, pour le 20.',
        'Passe la commande n°14 en essayage.',
        'Enregistre ces mesures pour Joseph.',
        'Prépare une facture pour la commande de mariage.',
        'Donne-moi le lien de partage de cette commande.',
      ],
      pillars: [
        {
          key: 'voice',
          title: 'Mains libres quand vos mains travaillent',
          body: 'Parlez-lui pendant que vous coupez ou épinglez, et faites-vous lire les réponses. Des indicateurs clairs montrent quand il écoute et quand il parle : vous savez toujours où vous en êtes.',
        },
        {
          key: 'shield',
          title: 'Il demande avant d’enregistrer',
          body: 'Toute action qui modifie vos données arrive sous forme de carte de confirmation listant exactement ce qui sera écrit. Lisez, changez d’avis, ou confirmez. Rien ne se fait dans votre dos.',
        },
        {
          key: 'globe',
          title: 'Des réponses dans votre langue',
          body: 'Demandez en français ou en anglais, il répond dans la même langue. Il comprend le vocabulaire du métier dans les deux : poitrine et chest désignent la même mesure pour lui.',
        },
        {
          key: 'offline',
          title: 'Privé par défaut',
          body: 'Votre conversation reste sur votre appareil, pas sur nos serveurs. Nous n’en conservons rien. Les messages les plus anciens disparaissent à mesure que la discussion s’allonge, et vous pouvez tout effacer quand vous voulez. L’assistant ne lit jamais que les données de votre propre atelier.',
        },
      ] as Feature[],
      ctaTitle: 'Mettez un assistant dans votre atelier.',
      ctaBody: 'Gratuit pendant l’accès anticipé de SeamFlow.',
      backToFeatures: 'Voir toutes les fonctionnalités',
    },

    // ── /fr/alternatives/tailor-assist ─────────────────────────────────────
    alternativesPage: {
      metaTitle:
        'Une alternative à Tailor Assist : SeamFlow, comparé honnêtement | SeamFlow',
      metaDescription:
        'Vous hésitez entre SeamFlow et Tailor Assist ? Deux applications gratuites et hors ligne pour tailleurs. SeamFlow ajoute un assistant tailleur IA à qui parler, le scan des mesures sur papier et un studio de création. Comparaison honnête.',
      eyebrow: 'Comparatif',
      title: 'Vous cherchez une alternative à Tailor Assist ?',
      subtitle:
        'Tailor Assist et SeamFlow s’attaquent au même problème : une activité de couture qui tourne au carnet et à la mémoire. Les approches diffèrent. Voici une comparaison franche, y compris là où nous sommes en retard.',

      disclosureTitle: 'Qui a écrit ceci',
      disclosureBody:
        'Nous, qui faisons SeamFlow. Lisez donc ces lignes comme n’importe quel comparatif écrit par l’une des deux parties. Ce que nous pouvons promettre, c’est l’exactitude : tout ce qui concerne Tailor Assist provient de leur site public, et tout ce qui concerne SeamFlow est une fonctionnalité disponible aujourd’hui, pas une promesse. Essayez les deux ; elles sont gratuites.',
      updatedLabel:
        'Comparaison établie à partir des informations publiques disponibles en {date}.',

      strengthsHeading: 'Ce qui distingue SeamFlow',
      strengthsBody:
        'Voici ce qui nous a poussés à créer une application de plus plutôt qu’à en utiliser une existante.',
      strengths: [
        {
          key: 'assistant',
          title: 'Un assistant à qui vous pouvez parler',
          body: 'SeamFlow intègre un assistant IA branché sur vos propres données. Demandez « qu’est-ce qui est dû cette semaine ? » ou « qui me doit de l’argent ? » et il répond sur votre atelier. Dites-lui de créer une commande : il prépare la fiche, affiche une carte de confirmation, et attend. À l’écrit ou à la voix, en français ou en anglais. À la lecture de leur site, Tailor Assist n’a pas d’équivalent.',
        },
        {
          key: 'scan',
          title: 'Les mesures directement depuis le papier',
          body: 'Photographiez une fiche de mesures remplie : SeamFlow en lit les libellés et les chiffres pour que vous les vérifiiez. Photographiez une page vierge de votre carnet : elle devient un modèle réutilisable. Si vous avez des années d’archives papier, c’est la différence entre tout reprendre en une soirée et ne jamais s’y mettre.',
        },
        {
          key: 'design',
          title: 'Un studio de création, pas un simple champ photo',
          body: 'Rassemblez styles et tissus sur un tableau d’inspiration, ouvrez une image en plein écran, et laissez l’IA transformer une photo de référence en notes structurées (coupe, encolure, manche, finitions) que vous modifiez avant d’enregistrer. Puis associez-la à la commande concernée.',
        },
        {
          key: 'groups',
          title: 'Les commandes de groupe, vraiment intégrées',
          body: 'Mariages, aso-ebi et uniformes forment une seule commande, avec un responsable, un tissu partagé et les mesures de chaque membre, au lieu d’une dizaine de commandes éparses dont vous devez vous rappeler qu’elles vont ensemble.',
        },
      ] as Feature[],

      theirsHeading: 'Là où Tailor Assist vous conviendra peut-être mieux',
      theirsBody:
        'Sincèrement : si l’un de ces points décrit votre atelier, c’est aujourd’hui le meilleur outil pour vous, et autant vous le dire tout de suite.',
      theirs: [
        {
          title: 'Vous avez des employés',
          body: 'Tailor Assist propose des comptes pour le personnel, des accès par rôle et l’attribution de tâches le long d’une chaîne de production. SeamFlow est conçu pour un tailleur et ses propres fiches : impossible d’inviter un employé ou de confier un travail à quelqu’un d’autre.',
        },
        {
          title: 'Vous avez besoin de l’arabe ou de l’espagnol',
          body: 'Ils annoncent l’anglais, le français, l’arabe et l’espagnol. SeamFlow existe en anglais, en français et en portugais. Les nôtres sont complètes plutôt que partielles, mais si vos clients lisent l’arabe ou l’espagnol, ils l’ont aujourd’hui et nous non.',
        },
        {
          title: 'Vous voulez suivre les paiements',
          body: 'Ils annoncent le suivi des paiements par mobile money. SeamFlow enregistre un acompte et calcule le solde d’une facture, mais ne se connecte à aucun prestataire de paiement : le rapprochement reste manuel. Les paiements sont à notre feuille de route, et une feuille de route n’est pas une fonctionnalité.',
        },
        {
          title: 'Vous voulez des tableaux de bord',
          body: 'Ils proposent des écrans d’analyse et de reporting. SeamFlow n’a pas de section statistiques ; le plus proche est de demander à l’assistant comment vont les affaires, une bonne réponse à une question, mais pas un graphique à étudier.',
        },
      ],

      sharedHeading: 'Là où les deux se valent',
      sharedBody: 'Sur les fondamentaux, honnêtement, l’un ou l’autre fera l’affaire.',
      shared: [
        'Gratuit pour un tailleur indépendant',
        'Fonctionne sans réseau, se synchronise au retour de la connexion',
        'Clients, mesures et statut des commandes au même endroit',
        'Des factures à envoyer au client',
        'Partage WhatsApp sans que le client installe quoi que ce soit',
        'Fonctionne sur Android et dans un navigateur',
      ],

      ctaTitle: 'Essayez le temps d’une soirée.',
      ctaBody:
        'Gratuit pendant l’accès anticipé. Prenez un client et une commande, et voyez ce que ça donne.',
      backToFeatures: 'Voir toutes les fonctionnalités',
    },
  },
  pt: {
    // Strings viradas para pesquisa. Deliberadamente mais literais do que a
    // copy da página — uma tag de título tem de dizer o que o produto *é*.
    seo: {
      title:
        'SeamFlow: o assistente de IA para alfaiates — medidas, encomendas e faturas',
      description:
        'O SeamFlow é uma aplicação de assistente para alfaiates e criadores de moda. Digitalize medidas do papel, acompanhe encomendas, envie faturas e pergunte a um assistente de IA sobre o seu negócio. Multilingue, funciona offline, gratuito em acesso antecipado.',
      keywords: [
        'assistente para alfaiates',
        'aplicação para alfaiates',
        'assistente de IA para alfaiates',
        'software de alfaiataria',
        'aplicação de medidas para alfaiates',
        'gestão de encomendas de alfaiataria',
        'aplicação para atelier',
        'aplicação para criadores de moda',
        'digitalizar medidas',
        'faturação para alfaiates',
        'gestão de atelier',
      ],
    },
    // Nav labels are kept short on purpose. Portuguese runs longer than English
    // almost everywhere, and the full "Perguntas frequentes" pushed this row to
    // 87 characters against English's 55 — enough to wrap the bar at tablet
    // widths. "FAQ" is understood in Portuguese and is already what the French
    // nav uses; the long form still appears as the section heading below.
    nav: {
      features: 'Funcionalidades',
      assistant: 'Assistente IA',
      how: 'Como funciona',
      faq: 'FAQ',
      useOnBrowser: 'No navegador',
    },
    hero: {
      eyebrow: 'O assistente de IA para ateliers de alfaiataria',
      title: 'Todo o seu atelier, num só lugar tranquilo.',
      subtitle:
        'O SeamFlow é o assistente que mantém juntos os seus clientes, medidas, encomendas e prazos, com um assistente de IA que responde a perguntas sobre o seu negócio e trata dos registos por si.',
      ctaPrimary: 'Usar no navegador',
      ctaSecondary: 'Ver como funciona',
      note: 'Funciona offline · Português, inglês e francês · Gratuito em acesso antecipado',
    },
    store: {
      soon: 'Em breve',
      appStore: 'Descarregar na App Store',
      googlePlay: 'Disponível no Google Play',
      androidEyebrow: 'APK Android',
      androidCta: 'Descarregar para Android',
    },
    problem: {
      eyebrow: 'O problema',
      title:
        'Medidas no papel. Datas de cabeça. Referências de design no grupo de conversa.',
      body: 'Quando tudo vive em sítios diferentes, um prazo escapa, uma medida tem de ser tirada outra vez e um cliente pergunta “já está?” pela décima vez. É muito para segurar.',
      solutionTitle: 'O SeamFlow segura isso por si.',
      solutionBody:
        'Um lugar para cada cliente, encomenda, prova e fatura. Um assistente a quem pode simplesmente perguntar, lembretes antes de cada prazo, uma página de encomenda para partilhar — e tudo continua a funcionar mesmo quando a rede não funciona.',
    },
    features: {
      heading: 'Tudo o que o ofício precisa',
      subheading:
        'Um assistente feito de propósito para a forma como os alfaiates realmente trabalham, não uma lista de tarefas genérica.',
      items: [
        {
          key: 'assistant',
          title: 'Assistente de IA, por texto ou por voz',
          body: 'Pergunte “o que vence esta semana?” ou “quem me deve?” e receba uma resposta direta. Diga-lhe para criar um cliente, uma encomenda ou uma fatura e ele prepara o registo, mostra-lhe exatamente o que vai ser guardado e espera pela sua confirmação.',
        },
        {
          key: 'scan',
          title: 'Digitalize medidas a partir do papel',
          body: 'Fotografe uma folha de medidas preenchida e o SeamFlow lê os números para um conjunto de medidas. Fotografe uma página em branco do caderno e ela torna-se um modelo reutilizável. Verifica cada valor antes de guardar.',
        },
        {
          key: 'clients',
          title: 'Clientes e medidas',
          body: 'Guarde cada cliente uma vez, com tantos conjuntos de medidas quantos precisar. Crie os seus próprios modelos por peça e reutilize as medidas guardadas na encomenda seguinte.',
        },
        {
          key: 'orders',
          title: 'Encomendas com acompanhamento de estado',
          body: 'Registada → em curso → prova → entregue. Toda a gente sabe exatamente em que ponto está o trabalho.',
        },
        {
          key: 'invoices',
          title: 'Faturas e sinais',
          body: 'Transforme qualquer encomenda numa fatura: mão de obra, tecido e extras em linhas separadas, o sinal registado e o saldo calculado por si. Partilhe como ligação ou PDF.',
        },
        {
          key: 'calendar',
          title: 'Calendário e lembretes',
          body: 'Veja cada prova e entrega dispostas por dia e receba um aviso antes de cada uma. Os prazos deixam de o apanhar desprevenido.',
        },
        {
          key: 'groups',
          title: 'Encomendas de grupo',
          body: 'Cortejos de casamento, aso-ebi, fardas: coordene um grupo inteiro com tecido partilhado e medidas por membro.',
        },
        {
          key: 'design',
          title: 'Estúdio de Design',
          body: 'Reúna inspiração e fotos de tecidos num quadro, abra qualquer imagem em ecrã inteiro e deixe a IA transformar uma foto de referência em notas de design claras e estruturadas.',
        },
        {
          key: 'share',
          title: 'Partilhe com os clientes',
          body: 'Envie uma ligação e o seu cliente vê a encomenda, o estado, a data da prova e as fotos, sem ter de instalar nada.',
        },
        {
          key: 'fabric',
          title: 'Biblioteca de tecidos',
          body: 'Fotografe o seu stock, registe o fornecedor e o custo por metro, e junte o tecido diretamente a uma encomenda.',
        },
        {
          key: 'devices',
          title: 'Telemóvel, tablet ou navegador',
          body: 'A aplicação Android no atelier, o mesmo SeamFlow no navegador de um portátil. Instale-o no ecrã principal e comporta-se como uma aplicação.',
        },
        {
          key: 'offline',
          title: 'Multilingue e offline',
          body: 'Português, inglês e francês completos. Registe encomendas e faça alterações no momento, mesmo sem rede. Sincroniza quando voltar.',
        },
      ] as Feature[],
    },
    spotlight: {
      eyebrow: 'Novo',
      title: 'Um assistente com quem pode mesmo falar.',
      body: 'A maioria dos programas de alfaiataria obriga-o a ir procurar a resposta. O assistente do SeamFlow conhece os seus clientes, encomendas, medidas e faturas — basta perguntar, na sua língua, a escrever ou a falar.',
      examples: [
        'O que vence esta semana?',
        'Quem ainda me deve dinheiro?',
        'Como está o negócio este mês?',
        'Cria uma encomenda para a Amina, agbada, para o dia 20.',
      ],
      cta: 'Ver o que o assistente consegue fazer',
    },
    steps: {
      eyebrow: 'Três passos',
      heading: 'A funcionar em minutos',
      items: [
        {
          title: 'Adicione um cliente',
          body: 'Nome, telefone, medidas: escreva-os, importe dos contactos ou digitalize uma folha de medidas preenchida com a câmara.',
        },
        {
          title: 'Crie uma encomenda',
          body: 'Escolha uma peça, defina a data de entrega, junte notas de design e fotos de referência. Ou basta dizer ao assistente e confirmar.',
        },
        {
          title: 'Seja lembrado, receba o pagamento',
          body: 'O SeamFlow avisa-o antes de cada prova e prazo, mantém o cliente a par e transforma a encomenda terminada numa fatura.',
        },
      ] as Step[],
    },
    vision: {
      eyebrow: 'Porque o construímos',
      title: 'O companheiro de negócio para um ofício que o merece.',
      body: 'Os alfaiates independentes gerem negócios a sério com cadernos e memória. O SeamFlow dá a esse ofício ferramentas modernas: um assistente no bolso, multilingue desde o primeiro dia, feito para funcionar offline, e a crescer para todas as línguas e mercados onde ainda se faz roupa boa à mão.',
      photoAlt:
        'A bancada de um alfaiate: uma velha máquina de costura Singer, tesouras e tecido escuro, num atelier em funcionamento.',
    },
    gallery: {
      heading: 'Um olhar por dentro',
      subheading:
        'A aplicação real, num telemóvel real. Claro ou escuro, acompanha aquilo que o seu dispositivo estiver a usar.',
      altPhone:
        'Ecrã principal do SeamFlow num telemóvel Android em modo escuro, com encomendas, clientes, grupos, calendário, modelos, tecidos, Estúdio de Design e o assistente.',
      altTablet:
        'Ecrã principal do SeamFlow num tablet em modo claro, com os mesmos mosaicos distribuídos por um ecrã mais largo.',
    },
    faq: {
      heading: 'Perguntas, respondidas',
      items: [
        {
          q: 'O SeamFlow tem um assistente de IA para alfaiates?',
          a: 'Tem. O SeamFlow inclui um assistente de IA integrado a quem pode escrever ou falar. Responde a perguntas sobre o seu próprio negócio: o que vence, quem lhe deve, como está a correr o mês. Também pode criar clientes, encomendas, medidas e faturas por si. Mostra sempre exatamente o que está prestes a guardar e espera pela sua confirmação.',
          href: '/tailor-assistant',
          linkLabel: 'Mais sobre o assistente',
        },
        {
          q: 'Posso digitalizar medidas do papel em vez de as escrever?',
          a: 'Pode. Tire uma foto de frente de uma folha de medidas preenchida e o SeamFlow lê as etiquetas e os números para um conjunto de medidas. Fotografe uma página em branco do seu caderno e ela torna-se um modelo reutilizável. Nada é guardado antes de verificar cada linha com a foto.',
        },
        {
          q: 'Posso enviar faturas aos clientes?',
          a: 'Pode. Qualquer encomenda pode tornar-se uma fatura com linhas separadas para mão de obra, tecido e extras. Registe um sinal e o SeamFlow calcula o saldo devido; depois partilhe a fatura como ligação ou PDF.',
        },
        {
          q: 'O SeamFlow funciona no computador ou só no telemóvel?',
          a: 'Nos dois. Há uma aplicação Android para o atelier e o mesmo SeamFlow corre em qualquer navegador moderno num portátil ou computador. Pode instalá-lo no ecrã principal ou no ambiente de trabalho e comporta-se como uma aplicação nativa.',
        },
        {
          q: 'Quanto custa?',
          a: 'O SeamFlow está em acesso antecipado. As funcionalidades principais são gratuitas enquanto o construímos; qualquer plano pago será claramente opcional.',
        },
        {
          q: 'O que distingue o SeamFlow de outras aplicações para alfaiates?',
          a: 'Três coisas: funciona sem rede, por isso o atelier nunca para; é realmente multilingue em vez de traduzido à pressa; e o assistente está ligado aos seus dados reais, por isso responde sobre as suas encomendas e clientes em vez de dar conselhos genéricos.',
        },
        {
          q: 'Que línguas são suportadas?',
          a: 'Português, inglês e francês hoje, na totalidade. Todos os ecrãs, não apenas os menus. Mais a caminho.',
        },
        {
          q: 'Funciona offline?',
          a: 'Sim. Pode navegar, registar encomendas e fazer alterações sem ligação; tudo sincroniza quando voltar a estar online.',
        },
        {
          q: 'Os meus clientes precisam de instalar alguma coisa?',
          a: 'Não. Partilha uma ligação e eles veem a encomenda ou a fatura em qualquer navegador.',
        },
        {
          q: 'Posso bloquear a aplicação para mais ninguém a abrir?',
          a: 'Pode. Pode definir um PIN de quatro dígitos e o SeamFlow bloqueia-se ao fim de alguns minutos em segundo plano, para que a sua lista de clientes continue a ser sua mesmo que outra pessoa pegue no telemóvel.',
        },
        {
          q: 'Os meus dados são privados?',
          a: 'Os seus dados são seus; não os vendemos. A nossa Política de Privacidade explica exatamente o que é guardado e quais são os seus direitos.',
          href: '/privacy',
          linkLabel: 'Ler a Política de Privacidade',
        },
        {
          q: 'Em que dispositivos funciona?',
          a: 'Telemóveis e tablets Android hoje, qualquer navegador em portátil ou computador, e iOS em breve.',
        },
      ] as Faq[],
    },
    cta: {
      title: 'Junte o seu atelier num só lugar.',
      body: 'Junte-se aos alfaiates que fazem do SeamFlow o seu assistente diário.',
    },
    footer: {
      tagline:
        'O assistente de IA para alfaiates e a casa tranquila do seu negócio de alfaiataria.',
      product: 'Produto',
      legal: 'Legal',
      contact: 'Contacto',
      links: {
        features: 'Funcionalidades',
        assistant: 'Assistente de IA para alfaiates',
        compare: 'Como nos comparamos',
        how: 'Como funciona',
        faq: 'Perguntas frequentes',
        privacy: 'Política de Privacidade',
        terms: 'Termos',
        support: 'Apoio',
        deleteAccount: 'Eliminar conta',
      },
      email: 'contactseamflow@gmail.com',
      phone: '+237 670 15 19 73',
      rights: '© {year} SeamFlow. Todos os direitos reservados.',
      madeWith: 'Feito para alfaiates, em todo o lado.',
    },
    legal: {
      lastUpdated: 'Última atualização',
      backToHome: 'Voltar ao início',
      privacyTitle: 'Política de Privacidade',
      termsTitle: 'Termos de Serviço',
      supportTitle: 'Apoio',
    },
    deleteAccount: {
      metaTitle: 'Eliminar a sua conta SeamFlow',
      metaDescription:
        'Como eliminar a sua conta SeamFlow e tudo o que está guardado com ela — a partir da aplicação, ou escrevendo-nos se já não a tiver instalada.',
      title: 'Eliminar a sua conta',
      intro:
        'Pode encerrar a sua conta SeamFlow a qualquer momento, e levar antes uma cópia dos seus registos.',

      inAppHeading: 'A partir da aplicação (mais rápido)',
      inAppBody:
        'Se ainda conseguir iniciar sessão, este é o caminho mais rápido e mantém o controlo do princípio ao fim.',
      inAppStep1: 'Abra o SeamFlow e vá a Definições.',
      inAppStep2: 'Em Conta, toque em “Eliminar a minha conta”.',
      inAppStep3:
        'Transfira uma cópia dos seus dados se quiser, confirme que é você e confirme a eliminação.',

      emailHeading: 'Se já não tiver a aplicação',
      emailBody:
        'Escreva-nos a partir do endereço de e-mail da conta e iniciaremos o mesmo processo por si. Podemos fazer uma pergunta ou duas para confirmar que a conta é sua — nunca lhe pediremos a palavra-passe.',
      emailCta: 'Enviar e-mail para eliminar a minha conta',
      mailSubject: 'Por favor, eliminem a minha conta SeamFlow',
      mailBody:
        'Olá,\n\nPor favor, eliminem a minha conta SeamFlow e os dados guardados com ela.\n\nO endereço de e-mail da minha conta é: \n\nObrigado.',

      whatHappensHeading: 'O que acontece',
      whatHappensIntro:
        'A eliminação remove a sua conta e os registos associados. É exatamente isto que abrange.',

      erasedHeading: 'Apagado',
      erased1: 'O seu perfil e o seu acesso — deixará de conseguir iniciar sessão',
      erased2:
        'Os seus clientes e as respetivas medidas, encomendas, encomendas de grupo e faturas',
      erased3: 'Todas as fotos que carregou, incluindo a sua página pública',
      erased4: 'Os seus pedidos, propostas e medidas guardadas',

      keptHeading: 'Mantido',
      kept1:
        'As mensagens que enviou ficam na conversa da outra pessoa, sem o seu nome e sem o conteúdo.',
      kept2:
        'Registos anónimos, sem nada de pessoal, quando são necessários para a aplicação continuar a funcionar para os outros.',

      graceHeading: 'Tem 30 dias para mudar de ideias',
      graceBody:
        'Nada é apagado de imediato. A sua página pública desaparece logo e as notificações param, mas os seus registos ficam intactos durante 30 dias — inicie sessão nesse período e toque em “Manter a minha conta” para cancelar. Passados 30 dias é definitivo e não conseguimos recuperar.',

      privacyNote: 'Para saber mais sobre o que guardamos e porquê, consulte a nossa',
    },

    support: {
      intro: 'Precisa de ajuda? Teremos todo o gosto em ajudar.',
      emailHeading: 'Escreva-nos',
      emailBody: 'Escreva-nos e respondemos dentro de alguns dias.',
      faqHeading: 'Perguntas comuns',
      faqBody: 'A maioria das respostas está nas nossas perguntas frequentes.',
      faqLink: 'Ler as perguntas frequentes',
    },

    // ── /tailor-assistant ───────────────────────────────────────────────────
    assistantPage: {
      metaTitle:
        'Assistente de IA para alfaiates: pergunte sobre o seu atelier, por texto ou voz | SeamFlow',
      metaDescription:
        'O assistente de IA do SeamFlow responde a perguntas sobre as suas encomendas, clientes e faturas, e cria registos por si mediante confirmação. Escreva ou fale, em português, inglês ou francês. Gratuito em acesso antecipado.',
      eyebrow: 'Dentro do SeamFlow',
      title: 'O assistente de IA para o seu atelier.',
      subtitle:
        'Qualquer aplicação de alfaiataria guarda as suas encomendas. O assistente do SeamFlow responde a perguntas sobre elas e trata dos registos por si, na sua língua, a escrever ou a falar.',
      askHeading: 'Pergunte-lhe sobre o seu negócio',
      askBody:
        'O assistente lê os seus dados reais antes de responder, por isso estas não são respostas enlatadas. São sobre o seu atelier, hoje.',
      askItems: [
        'O que vence esta semana?',
        'Quem ainda me deve dinheiro?',
        'Como está o negócio este mês?',
        'O que fiz para a Amina da última vez?',
        'Que encomendas estão à espera de prova?',
        'Quantas fardas faltam na encomenda de grupo da escola?',
      ],
      doHeading: 'Diga-lhe o que fazer',
      doBody:
        'O assistente pode criar e atualizar registos, mas nunca escreve nada em silêncio. Prepara a alteração, mostra-lhe um cartão de confirmação com todos os campos discriminados, e nada é guardado até tocar em Confirmar.',
      doItems: [
        'Cria um cliente chamado Amina, número 6xx xx xx xx.',
        'Nova encomenda para a Amina, agbada, para o dia 20.',
        'Passa a encomenda #14 para prova.',
        'Guarda estas medidas no Joseph.',
        'Prepara uma fatura para a encomenda do casamento.',
        'Envia-me a ligação de partilha dessa encomenda.',
      ],
      pillars: [
        {
          key: 'voice',
          title: 'Mãos livres quando tem as mãos ocupadas',
          body: 'Fale com ele enquanto corta ou alfineta, e ouça as respostas em voz alta. Indicadores claros mostram quando está a ouvir e quando está a falar, para saber sempre o que se passa.',
        },
        {
          key: 'shield',
          title: 'Pergunta antes de guardar',
          body: 'Qualquer ação que altere os seus dados chega como um cartão de confirmação com tudo o que vai ser escrito. Leia, mude de ideias ou confirme. Nada acontece nas suas costas.',
        },
        {
          key: 'globe',
          title: 'Respostas na sua língua',
          body: 'Pergunte em português, inglês ou francês e ele responde na mesma língua. Percebe o vocabulário do ofício em todas: peito, poitrine e chest são a mesma medida para ele.',
        },
        {
          key: 'offline',
          title: 'Privado por definição',
          body: 'A sua conversa fica no seu dispositivo, não nos nossos servidores. Não guardamos nada dela. As mensagens antigas vão caindo à medida que a conversa cresce, e pode apagá-la quando quiser. O assistente só lê os dados do seu próprio atelier.',
        },
      ] as Feature[],
      ctaTitle: 'Ponha um assistente no seu atelier.',
      ctaBody: 'Gratuito enquanto o SeamFlow estiver em acesso antecipado.',
      backToFeatures: 'Ver todas as funcionalidades',
    },

    // ── /alternatives/tailor-assist ─────────────────────────────────────────
    alternativesPage: {
      metaTitle:
        'Uma alternativa ao Tailor Assist: o SeamFlow, comparado com honestidade | SeamFlow',
      metaDescription:
        'A comparar o SeamFlow com o Tailor Assist? Ambos são gratuitos e funcionam offline. O SeamFlow acrescenta um assistente de IA com quem pode falar, digitalização de medidas a partir do papel e um estúdio de design. Um olhar honesto sobre onde cada um ganha.',
      eyebrow: 'Comparação',
      title: 'À procura de uma alternativa ao Tailor Assist?',
      subtitle:
        'O Tailor Assist e o SeamFlow partem do mesmo problema: um negócio de alfaiataria gerido a cadernos e memória. Abordam-no de formas diferentes. Aqui fica uma comparação direta, incluindo as partes em que ficamos a perder.',

      disclosureTitle: 'Quem escreveu isto',
      disclosureBody:
        'Fomos nós. Fazemos o SeamFlow, por isso leia isto como leria qualquer comparação escrita por uma das partes. O que podemos prometer é rigor: tudo o que se diz abaixo sobre o Tailor Assist vem do site público deles, e tudo o que se diz sobre o SeamFlow é uma funcionalidade que pode usar hoje, não uma promessa. Experimente os dois; são ambos gratuitos.',
      updatedLabel: 'Comparado com informação pública disponível em {date}.',

      strengthsHeading: 'Onde o SeamFlow é diferente',
      strengthsBody:
        'Foram estas as coisas que nos levaram a construir mais uma aplicação de alfaiataria em vez de usar uma existente.',
      strengths: [
        {
          key: 'assistant',
          title: 'Um assistente com quem pode falar',
          body: 'O SeamFlow tem um assistente de IA integrado, ligado aos seus próprios dados. Pergunte “o que vence esta semana?” ou “quem me deve?” e ele responde sobre o seu atelier. Diga-lhe para criar uma encomenda e ele prepara o registo, mostra um cartão de confirmação e espera. Pode escrever ou falar. Tanto quanto vemos no site deles, o Tailor Assist não tem equivalente.',
        },
        {
          key: 'scan',
          title: 'Medidas tiradas diretamente do papel',
          body: 'Fotografe uma folha de medidas preenchida e o SeamFlow lê as etiquetas e os números para um conjunto de medidas que pode verificar. Fotografe uma página em branco do caderno e ela torna-se um modelo reutilizável. Se tem anos de registos em papel, é a diferença entre migrar numa noite e nunca migrar.',
        },
        {
          key: 'design',
          title: 'Um estúdio de design, não só um campo para fotos',
          body: 'Reúna referências de estilo e tecido num quadro, abra qualquer imagem em ecrã inteiro e deixe a IA transformar uma foto de referência em notas estruturadas (corte, decote, manga, acabamento) que edita antes de guardar. Depois junte-a à encomenda a que pertence.',
        },
        {
          key: 'groups',
          title: 'Encomendas de grupo tratadas a sério',
          body: 'Casamentos, aso-ebi e fardas são uma encomenda com um responsável, um tecido partilhado e medidas por membro — não uma dúzia de encomendas soltas que tem de se lembrar que andam juntas.',
        },
      ] as Feature[],

      theirsHeading: 'Onde o Tailor Assist lhe pode servir melhor',
      theirsBody:
        'A sério. Se alguma destas coisas descreve o seu atelier, hoje a ferramenta melhor é a deles — e preferimos dizê-lo já a fazê-lo perder a noite.',
      theirs: [
        {
          title: 'Tem funcionários',
          body: 'O Tailor Assist oferece contas de funcionário, acesso por função e atribuição de tarefas ao longo de uma linha de produção. O SeamFlow é hoje feito para um alfaiate e os seus próprios registos. Não há forma de convidar um empregado nem de passar um trabalho a outra pessoa.',
        },
        {
          title: 'Precisa de árabe ou espanhol',
          body: 'Eles anunciam inglês, francês, árabe e espanhol. O SeamFlow existe em inglês, francês e português. As nossas são traduções completas e não parciais, mas se os seus clientes leem árabe ou espanhol, eles têm-no hoje e nós não.',
        },
        {
          title: 'Quer acompanhamento de pagamentos',
          body: 'Eles anunciam acompanhamento de pagamentos por dinheiro móvel. O SeamFlow regista um sinal e calcula o saldo numa fatura, mas não liga a nenhum fornecedor de pagamentos. A reconciliação do dinheiro é sua. Os pagamentos estão no nosso plano, e um plano não é uma funcionalidade.',
        },
        {
          title: 'Quer painéis e relatórios',
          body: 'Eles oferecem análises de negócio e ecrãs de relatórios. O SeamFlow não tem secção de relatórios; o mais próximo é perguntar ao assistente como vai o negócio, o que é uma boa resposta a uma pergunta mas não um gráfico para estudar.',
        },
      ],

      sharedHeading: 'Onde os dois são muito parecidos',
      sharedBody: 'No essencial, honestamente, ficaria bem com qualquer um.',
      shared: [
        'Gratuito para um alfaiate independente',
        'Funciona sem rede e sincroniza quando ela volta',
        'Clientes, medidas e estado das encomendas num só lugar',
        'Faturas que pode enviar a um cliente',
        'Partilha para o WhatsApp sem o cliente instalar nada',
        'Funciona em Android e no navegador',
      ],

      ctaTitle: 'Experimente durante uma noite.',
      ctaBody:
        'Gratuito enquanto o SeamFlow estiver em acesso antecipado. Traga um cliente e uma encomenda e veja como é.',
      backToFeatures: 'Ver todas as funcionalidades',
    },
  },
};

export type Dict = (typeof copy)['en'];
export const getDict = (lang: Lang): Dict => copy[lang];

/**
 * Month the /alternatives comparison was last checked against public sources.
 * Shown on the page — a comparison with no date is worthless to a reader, and
 * this one will go stale as both products ship. Re-check it when you bump it.
 */
export const COMPARISON_UPDATED = '2026-08';

export const SITE = {
  name: 'SeamFlow',
  domain: 'www.seamflowtech.com',
  url: 'https://www.seamflowtech.com',
  email: 'contactseamflow@gmail.com',
  phone: '+237 670 15 19 73',
  phoneHref: 'tel:+237670151973',
};

// Direct Android APK download. Empty string → not yet available (the Android
// badge falls back to a "coming soon" state). Set to the built .apk URL to turn
// on the real "Download for Android" button.
//
// Points at a GitHub Release asset, and the URL is deliberately shaped so it
// never has to change again:
//
//   /releases/latest/download/SeamFlow-android.apk
//
// `latest` resolves to the newest non-prerelease, and the asset FILENAME is
// stable across builds — the version lives in the release tag and title, not in
// the file. Publishing a new build is therefore: create a release, attach the
// APK under exactly this name. Nothing here needs editing, and the download
// button cannot rot again.
//
// This replaced an EAS artifact link, which is the mistake worth not repeating.
// EAS free-tier artifacts are deleted after about 30 days, so the button had
// been silently 404ing — the page still rendered, the badge still looked real,
// and a visitor's download just failed. Never point this at an EAS URL.
//
// It is NOT served from public/. A 102 MB binary in git bloats every clone
// forever and counts against the Vercel deployment. A release asset on a public
// repo is free, permanent, uncapped for bandwidth, and carries no repo weight.
export const ANDROID_APK_URL =
  'https://github.com/Diamondhanson/SeamFlow/releases/latest/download/SeamFlow-android.apk';

// The installable browser build of the tailor app (seamflow-app's web target,
// `expo export --platform web`). Empty string → not deployed yet: the badge
// still renders, but clicking it shows a "coming soon" toast instead of
// navigating. Set this to the deployed origin and the same badge silently
// becomes a real link — no other change needed.
export const WEB_APP_URL = 'https://app.seamflowtech.com';
