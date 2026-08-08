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

export type Lang = 'en' | 'fr';
export const LANGS: Lang[] = ['en', 'fr'];

/** Coerce an unknown value into a supported language (English default). */
export function resolveLang(v: string | string[] | undefined): Lang {
  const s = Array.isArray(v) ? v[0] : v;
  return s === 'fr' ? 'fr' : 'en';
}

/**
 * Strip a leading `/fr` so a path can be re-prefixed for either language.
 * `/fr/privacy` → `/privacy`, `/fr` → `/`, `/privacy` → `/privacy`.
 */
export function stripLang(path: string): string {
  const [base, hash] = path.split('#');
  const bare = base === '/fr' ? '/' : base.replace(/^\/fr(?=\/)/, '');
  return `${bare || '/'}${hash ? `#${hash}` : ''}`;
}

/**
 * Prefix a language-neutral path for the given language, preserving hash
 * anchors. English is the un-prefixed default; French lives under `/fr`.
 *
 * French used to be a `?lang=fr` query on the same URL, which meant Google saw
 * one page in two languages and indexed neither cleanly. Distinct paths plus
 * the hreflang tags in lib/seo.ts is what makes the French half crawlable.
 *
 * Accepts an already-prefixed path (it strips first), so passing a live
 * `usePathname()` through is safe.
 */
export function withLang(path: string, lang: Lang): string {
  const [base, hash] = stripLang(path).split('#');
  const p = lang === 'fr' ? (base === '/' ? '/fr' : `/fr${base}`) : base;
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
        'SeamFlow — the AI tailor assistant for measurements, orders & invoices',
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
        'SeamFlow is the tailor assistant that keeps your clients, measurements, orders and deadlines together — with an AI assistant that answers questions about your business and files the work for you.',
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
        'One place for every client, order, fitting and invoice — with an assistant you can simply ask, reminders before every deadline, a shareable order page, and it all keeps working even when the network doesn’t.',
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
      body: 'Most tailoring software makes you go and find the answer. SeamFlow’s assistant knows your clients, orders, measurements and invoices — so you can just ask, in English or French, by typing or by speaking.',
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
          body: 'Name, phone, measurements — type them, import from your contacts, or scan a filled measurement sheet with the camera.',
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
        'The real app, on a real phone. Light or dark — it follows whatever your device is set to.',
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
          a: 'Yes. SeamFlow includes a built-in AI tailor assistant you can type to or speak to. It answers questions about your own business — what’s due, who owes you, how the month is going — and it can create clients, orders, measurements and invoices for you. It always shows you exactly what it’s about to save and waits for your confirmation first.',
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
          a: 'English and French today, fully — every screen, not just the menus. More on the way.',
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
          a: 'Yes. You can set a four-digit PIN, and SeamFlow locks itself after a few minutes in the background — so your client list stays yours even if someone else picks up the phone.',
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
      },
      email: 'contactseamflow@gmail.com',
      phone: '+237 670 15 19 73',
      rights: '© {year} SeamFlow. All rights reserved.',
      madeWith: 'Made for tailors, everywhere.',
    },
    legal: {
      lastUpdated: 'Last updated',
      backToHome: 'Back to home',
      draftNotice:
        'This is draft copy for review, so please have it checked before publishing.',
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

    // ── /tailor-assistant — the dedicated keyword landing page ──────────────
    assistantPage: {
      metaTitle: 'AI tailor assistant — ask about your workshop, by text or voice | SeamFlow',
      metaDescription:
        'SeamFlow’s AI tailor assistant answers questions about your own orders, clients and invoices, and creates records for you on confirmation. Type or speak, in English or French. Free in early access.',
      eyebrow: 'Inside SeamFlow',
      title: 'The AI tailor assistant for your workshop.',
      subtitle:
        'Every tailoring app can store your orders. SeamFlow’s assistant can answer questions about them — and do the filing for you, in your own language, by typing or by speaking.',
      askHeading: 'Ask it about your business',
      askBody:
        'The assistant reads your live data before it answers, so these aren’t canned replies — they’re about your workshop, today.',
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
        'The assistant can create and update records — but it never writes anything silently. It builds the change, shows you a confirmation card with every field spelled out, and nothing is saved until you tap Confirm.',
      doItems: [
        'Create a client called Amina, number 6xx xx xx xx.',
        'New order for Amina — agbada, due the 20th.',
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
          body: 'Ask in English or French and it replies in the same language. It understands the vocabulary of the trade in both — poitrine and chest are the same measurement to it.',
        },
        {
          key: 'offline',
          title: 'Private by default',
          body: 'Your conversation lives on your device, not on our servers — we store none of it. Older messages drop away as the thread grows, and you can wipe it whenever you like. The assistant only ever reads your own workshop’s data.',
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
        'Tailor Assist and SeamFlow set out to solve the same problem: a tailoring business run on notebooks and memory. They go about it differently. Here is a straight comparison — including the parts where we come off worse.',

      disclosureTitle: 'Who wrote this',
      disclosureBody:
        'We did — we make SeamFlow, so read this the way you would read any comparison written by one of the two sides. What we can promise is accuracy: everything below about Tailor Assist comes from their own public website, and everything about SeamFlow is a feature you can use today, not a roadmap item. Try both; they are both free.',
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
          body: 'Collect style and fabric references into a mood board, open any image full-screen, and let AI turn a reference photo into structured garment notes — cut, neckline, sleeve, finish — that you edit before saving. Then attach it to the order it belongs to.',
        },
        {
          key: 'groups',
          title: 'Group orders as a first-class thing',
          body: 'Weddings, aso-ebi and uniforms are one order with an owner, a shared fabric and per-member measurements — not a dozen loose orders you have to remember belong together.',
        },
      ] as Feature[],

      theirsHeading: 'Where Tailor Assist may suit you better',
      theirsBody:
        'Genuinely — if any of these is how your shop runs, they are the better tool today, and we would rather tell you now than waste your evening.',
      theirs: [
        {
          title: 'You have staff',
          body: 'Tailor Assist offers staff accounts, role-based access and task assignment across a production pipeline. SeamFlow today is built for one tailor and their own records — there is no way to invite an employee or hand a job to someone else.',
        },
        {
          title: 'You need Arabic or Spanish',
          body: 'They list English, French, Arabic and Spanish. SeamFlow is English and French only. Ours are complete rather than partial translations, but two languages is two languages.',
        },
        {
          title: 'You want payment tracking',
          body: 'They advertise mobile money payment tracking. SeamFlow records a deposit and works out the balance on an invoice, but it does not connect to a payment provider — you reconcile money yourself. Payments are on our roadmap, and a roadmap is not a feature.',
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
        'SeamFlow — l’assistant tailleur IA pour mesures, commandes et factures',
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
        'SeamFlow est l’assistant tailleur qui réunit vos clients, mesures, commandes et échéances — avec un assistant IA qui répond à vos questions et enregistre le travail à votre place.',
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
        'Un seul endroit pour chaque client, commande, essayage et facture — avec un assistant à qui il suffit de demander, des rappels avant chaque échéance, une page de commande partageable, et tout continue de fonctionner même sans réseau.',
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
      body: 'La plupart des logiciels de couture vous obligent à aller chercher la réponse. L’assistant de SeamFlow connaît vos clients, commandes, mesures et factures — il suffit de demander, en français ou en anglais, à l’écrit ou à la voix.',
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
          body: 'Nom, téléphone, mesures — saisissez-les, importez depuis vos contacts, ou scannez une fiche de mesures remplie avec l’appareil photo.',
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
        'La vraie application, sur un vrai téléphone. Clair ou sombre — elle suit le réglage de votre appareil.',
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
          a: 'Oui. SeamFlow intègre un assistant tailleur IA auquel vous pouvez écrire ou parler. Il répond aux questions sur votre propre activité — ce qui est dû, qui vous doit de l’argent, comment se passe le mois — et il peut créer clients, commandes, mesures et factures. Il vous montre toujours exactement ce qu’il va enregistrer et attend votre confirmation.',
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
          a: 'Le français et l’anglais aujourd’hui, entièrement — chaque écran, pas seulement les menus. D’autres à venir.',
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
          a: 'Oui. Vous pouvez définir un code PIN à quatre chiffres, et SeamFlow se verrouille après quelques minutes en arrière-plan — pour que votre fichier client reste le vôtre même si quelqu’un prend votre téléphone.',
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
      },
      email: 'contactseamflow@gmail.com',
      phone: '+237 670 15 19 73',
      rights: '© {year} SeamFlow. Tous droits réservés.',
      madeWith: 'Conçu pour les tailleurs, partout.',
    },
    legal: {
      lastUpdated: 'Dernière mise à jour',
      backToHome: 'Retour à l’accueil',
      draftNotice:
        'Texte provisoire à relire : faites-le vérifier avant publication.',
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

    assistantPage: {
      metaTitle:
        'Assistant tailleur IA — interrogez votre atelier, à l’écrit ou à la voix | SeamFlow',
      metaDescription:
        'L’assistant tailleur IA de SeamFlow répond aux questions sur vos propres commandes, clients et factures, et crée les fiches pour vous après confirmation. Écrivez ou parlez, en français ou en anglais. Gratuit en accès anticipé.',
      eyebrow: 'Dans SeamFlow',
      title: 'L’assistant tailleur IA de votre atelier.',
      subtitle:
        'Toutes les applications savent stocker vos commandes. L’assistant de SeamFlow sait y répondre — et fait le classement à votre place, dans votre langue, à l’écrit ou à la voix.',
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
        'L’assistant peut créer et modifier des fiches — mais il n’écrit jamais en silence. Il prépare la modification, affiche une carte de confirmation détaillant chaque champ, et rien n’est enregistré tant que vous n’avez pas touché Confirmer.',
      doItems: [
        'Crée une cliente Amina, numéro 6xx xx xx xx.',
        'Nouvelle commande pour Amina — agbada, pour le 20.',
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
          body: 'Demandez en français ou en anglais, il répond dans la même langue. Il comprend le vocabulaire du métier dans les deux — poitrine et chest désignent la même mesure pour lui.',
        },
        {
          key: 'offline',
          title: 'Privé par défaut',
          body: 'Votre conversation reste sur votre appareil, pas sur nos serveurs — nous n’en conservons rien. Les messages les plus anciens disparaissent à mesure que la discussion s’allonge, et vous pouvez tout effacer quand vous voulez. L’assistant ne lit jamais que les données de votre propre atelier.',
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
        'Tailor Assist et SeamFlow s’attaquent au même problème : une activité de couture qui tourne au carnet et à la mémoire. Les approches diffèrent. Voici une comparaison franche — y compris là où nous sommes en retard.',

      disclosureTitle: 'Qui a écrit ceci',
      disclosureBody:
        'Nous — nous faisons SeamFlow. Lisez donc ces lignes comme n’importe quel comparatif écrit par l’une des deux parties. Ce que nous pouvons promettre, c’est l’exactitude : tout ce qui concerne Tailor Assist provient de leur site public, et tout ce qui concerne SeamFlow est une fonctionnalité disponible aujourd’hui, pas une promesse. Essayez les deux ; elles sont gratuites.',
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
          body: 'Rassemblez styles et tissus sur un tableau d’inspiration, ouvrez une image en plein écran, et laissez l’IA transformer une photo de référence en notes structurées — coupe, encolure, manche, finitions — que vous modifiez avant d’enregistrer. Puis associez-la à la commande concernée.',
        },
        {
          key: 'groups',
          title: 'Les commandes de groupe, vraiment intégrées',
          body: 'Mariages, aso-ebi et uniformes forment une seule commande, avec un responsable, un tissu partagé et les mesures de chaque membre — au lieu d’une dizaine de commandes éparses dont vous devez vous rappeler qu’elles vont ensemble.',
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
          body: 'Ils annoncent l’anglais, le français, l’arabe et l’espagnol. SeamFlow n’existe qu’en anglais et en français. Les nôtres sont complètes plutôt que partielles, mais deux langues restent deux langues.',
        },
        {
          title: 'Vous voulez suivre les paiements',
          body: 'Ils annoncent le suivi des paiements par mobile money. SeamFlow enregistre un acompte et calcule le solde d’une facture, mais ne se connecte à aucun prestataire de paiement : le rapprochement reste manuel. Les paiements sont à notre feuille de route, et une feuille de route n’est pas une fonctionnalité.',
        },
        {
          title: 'Vous voulez des tableaux de bord',
          body: 'Ils proposent des écrans d’analyse et de reporting. SeamFlow n’a pas de section statistiques ; le plus proche est de demander à l’assistant comment vont les affaires — une bonne réponse à une question, mais pas un graphique à étudier.',
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
// EAS build artifact (preview profile, points at the Render API).
// Built 2026-08-08 — includes the discovery feed, My Designs, and in-app chat.
//
// WARNING: EAS free-tier artifacts are retained ~30 days, so this link dies
// around 2026-09-07 and the download button will fail silently. Self-host the
// .apk (drop it in apps/seamflow-web/public/) for a link that doesn't expire.
export const ANDROID_APK_URL =
  'https://expo.dev/artifacts/eas/3uTMYnvA5L7JmJ10JLSigliA0OpJHYOyNsF4pnz-7dU.apk';

// The installable browser build of the tailor app (seamflow-app's web target,
// `expo export --platform web`). Empty string → not deployed yet: the badge
// still renders, but clicking it shows a "coming soon" toast instead of
// navigating. Set this to the deployed origin and the same badge silently
// becomes a real link — no other change needed.
export const WEB_APP_URL = 'https://app.seamflowtech.com';
