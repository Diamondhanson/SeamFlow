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
    catalogueNotFound:
      'We could not find that catalogue. The link may be mistyped, or the workshop may no longer be listed.',
    // Design-aware opener. The generic inquirePlaceholder still covers the
    // "message the shop" case, where there is no particular piece in mind.
    inquireAboutDesign: 'Hi! I\u2019m interested in {design}. Could you make something like this for me?',
    inquireAboutDesignPriced:
      'Hi! I\u2019m interested in {design} ({price}). Could you make something like this for me?',
    inquireDesignPinned: 'About {design}',
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
    catalogueNotFound:
      'Catalogue introuvable. Le lien est peut-être mal saisi, ou l’atelier n’est plus référencé.',
    inquireAboutDesign:
      'Bonjour ! Je suis intéressé(e) par {design}. Pourriez-vous me faire quelque chose comme ceci ?',
    inquireAboutDesignPriced:
      'Bonjour ! Je suis intéressé(e) par {design} ({price}). Pourriez-vous me faire quelque chose comme ceci ?',
    inquireDesignPinned: 'À propos de {design}',
  },
  pt: {
    // ── Feed ────────────────────────────────────────────────────────────────
    title: 'Descobrir',
    subtitle: 'Trabalho real, de alfaiates reais perto de si.',
    emptyTitle: 'Ainda não há nada aqui',
    emptyBody:
      'Os alfaiates ainda estão a adicionar o seu trabalho. Volte daqui a pouco — o feed vai enchendo à medida que publicam.',
    filterAll: 'Tudo',
    filterWomen: 'Mulher',
    filterMen: 'Homem',
    filterUnisex: 'Unissexo',
    filterChildren: 'Criança',
    occasionWedding: 'Casamento',
    occasionTraditional: 'Tradicional',
    occasionCorporate: 'Profissional',
    occasionCasual: 'Casual',
    occasionParty: 'Festa',
    clearFilters: 'Limpar',
    searchPlaceholder: 'Procurar estilos, tecidos, peças…',
    noMatch: 'Ainda nada corresponde a esses filtros.',

    // ── Detalhe da criação ──────────────────────────────────────────────────
    byTailor: 'Por {name}',
    verified: 'Verificado',
    repliesIn: 'Costuma responder em {hours}h',
    acceptsRemote: 'Trabalha com clientes em qualquer lugar',
    fromPrice: 'A partir de {price}',
    inquire: 'Perguntar sobre isto',
    save: 'Guardar',
    saved: 'Guardado',
    moreLikeThis: 'Mais como esta',
    viewTailor: 'Ver mais do trabalho deste alfaiate',

    // ── Vitrine ─────────────────────────────────────────────────────────────
    storefrontWorks: 'O trabalho deste alfaiate',
    storefrontEmpty: 'Ainda sem nada publicado.',
    memberSince: 'No SeamFlow desde {date}',
    specialties: 'Especialidades',
    speaks: 'Fala',

    // ── Pedir informação ────────────────────────────────────────────────────
    inquireTitle: 'Perguntar sobre esta peça',
    inquireBody:
      'Envie uma mensagem a {name}. Verá a criação sobre a qual está a perguntar e podem falar aqui.',
    inquirePlaceholder: 'Olá! Poderia fazer-me algo assim?',
    inquireSend: 'Enviar mensagem',
    inquireSending: 'A enviar…',
    inquireSignInTitle: 'Inicie sessão para enviar uma mensagem',
    inquireSignInBody:
      'Pode ver tudo sem conta. Iniciar sessão serve apenas para que os alfaiates lhe possam responder.',
    inquireSignIn: 'Iniciar sessão',

    // ── Navegação ───────────────────────────────────────────────────────────
    tabDiscover: 'Descobrir',
    tabMessages: 'Mensagens',
    tabOrders: 'As minhas encomendas',
    catalogueNotFound:
      'Não foi possível encontrar esse catálogo. O link pode estar mal escrito ou o atelier já não estar listado.',
    inquireAboutDesign:
      'Olá! Estou interessado(a) em {design}. Poderia fazer-me algo assim?',
    inquireAboutDesignPriced:
      'Olá! Estou interessado(a) em {design} ({price}). Poderia fazer-me algo assim?',
    inquireDesignPinned: 'Sobre {design}',
  },
  es: {
    // ── Muro ────────────────────────────────────────────────────────────────
    title: 'Descubrir',
    subtitle: 'Trabajo real, de sastres reales cerca de usted.',
    emptyTitle: 'Aún no hay nada aquí',
    emptyBody:
      'Los sastres todavía están subiendo su trabajo. Vuelva en un rato — el muro se llena a medida que publican.',
    filterAll: 'Todo',
    filterWomen: 'Mujeres',
    filterMen: 'Hombres',
    filterUnisex: 'Unisex',
    filterChildren: 'Niños',
    occasionWedding: 'Boda',
    occasionTraditional: 'Tradicional',
    occasionCorporate: 'Corporativo',
    occasionCasual: 'Informal',
    occasionParty: 'Fiesta',
    clearFilters: 'Quitar',
    searchPlaceholder: 'Buscar estilos, telas, prendas…',
    noMatch: 'Todavía no hay nada que coincida con esos filtros.',

    // ── Detalle del diseño ──────────────────────────────────────────────────
    byTailor: 'Por {name}',
    verified: 'Verificado',
    repliesIn: 'Suele responder en {hours} h',
    acceptsRemote: 'Trabaja con clientes de cualquier lugar',
    fromPrice: 'Desde {price}',
    inquire: 'Preguntar por esto',
    save: 'Guardar',
    saved: 'Guardado',
    moreLikeThis: 'Más como esto',
    viewTailor: 'Ver más de su trabajo',

    // ── Escaparate ──────────────────────────────────────────────────────────
    storefrontWorks: 'Su trabajo',
    storefrontEmpty: 'Aún no hay nada publicado.',
    memberSince: 'En SeamFlow desde {date}',
    specialties: 'Especialidades',
    speaks: 'Habla',

    // ── Consultar ───────────────────────────────────────────────────────────
    inquireTitle: 'Preguntar por esta pieza',
    inquireBody:
      'Envíe un mensaje a {name}. Verá el diseño por el que pregunta y podrán conversarlo aquí.',
    inquirePlaceholder: '¡Hola! ¿Podría hacerme algo así?',
    inquireSend: 'Enviar mensaje',
    inquireSending: 'Enviando…',
    inquireSignInTitle: 'Inicie sesión para enviar un mensaje',
    inquireSignInBody:
      'Puede ver todo sin una cuenta. Iniciar sesión solo sirve para que los sastres puedan responderle.',
    inquireSignIn: 'Iniciar sesión',

    // ── Navegación ──────────────────────────────────────────────────────────
    tabDiscover: 'Descubrir',
    tabMessages: 'Mensajes',
    tabOrders: 'Mis pedidos',
    catalogueNotFound:
      'No encontramos ese catálogo. Puede que el enlace esté mal escrito, o que el taller ya no aparezca listado.',
    inquireAboutDesign: '¡Hola! Me interesa {design}. ¿Podría hacerme algo así?',
    inquireAboutDesignPriced:
      '¡Hola! Me interesa {design} ({price}). ¿Podría hacerme algo así?',
    inquireDesignPinned: 'Sobre {design}',
  },
  sw: {
    // ── Mkondo ──────────────────────────────────────────────────────────────
    title: 'Gundua',
    subtitle: 'Kazi halisi, ya washonaji halisi walio karibu nawe.',
    emptyTitle: 'Bado hakuna kitu hapa',
    emptyBody:
      'Washonaji bado wanaongeza kazi zao. Rudi baada ya muda mfupi — mkondo hujaa wanapochapisha.',
    filterAll: 'Yote',
    filterWomen: 'Wanawake',
    filterMen: 'Wanaume',
    filterUnisex: 'Wote',
    filterChildren: 'Watoto',
    occasionWedding: 'Harusi',
    occasionTraditional: 'Kiasili',
    occasionCorporate: 'Kikazi',
    occasionCasual: 'Kawaida',
    occasionParty: 'Sherehe',
    clearFilters: 'Ondoa',
    searchPlaceholder: 'Tafuta mitindo, vitambaa, mavazi…',
    noMatch: 'Bado hakuna kinacholingana na vichujio hivyo.',

    // ── Maelezo ya ubunifu ──────────────────────────────────────────────────
    byTailor: 'Na {name}',
    verified: 'Amethibitishwa',
    repliesIn: 'Hujibu kwa kawaida ndani ya saa {hours}',
    acceptsRemote: 'Hufanya kazi na wateja popote walipo',
    fromPrice: 'Kuanzia {price}',
    inquire: 'Uliza kuhusu hii',
    save: 'Hifadhi',
    saved: 'Imehifadhiwa',
    moreLikeThis: 'Nyingine kama hii',
    viewTailor: 'Ona kazi zake zaidi',

    // ── Dirisha la duka ─────────────────────────────────────────────────────
    storefrontWorks: 'Kazi zake',
    storefrontEmpty: 'Bado hakuna kilichochapishwa.',
    memberSince: 'Yupo SeamFlow tangu {date}',
    specialties: 'Utaalamu',
    speaks: 'Anazungumza',

    // ── Kuuliza ─────────────────────────────────────────────────────────────
    inquireTitle: 'Uliza kuhusu kipande hiki',
    inquireBody:
      'Mtumie {name} ujumbe. Ataona ubunifu unaouulizia, na mnaweza kuujadili hapa.',
    inquirePlaceholder: 'Habari! Unaweza kunishonea kitu kama hiki?',
    inquireSend: 'Tuma ujumbe',
    inquireSending: 'Inatuma…',
    inquireSignInTitle: 'Ingia ili kutuma ujumbe',
    inquireSignInBody:
      'Unaweza kutazama kila kitu bila akaunti. Kuingia ni ili washonaji waweze kukujibu tu.',
    inquireSignIn: 'Ingia',

    // ── Urambazaji ──────────────────────────────────────────────────────────
    tabDiscover: 'Gundua',
    tabMessages: 'Ujumbe',
    tabOrders: 'Maagizo yangu',
    catalogueNotFound:
      'Hatukuweza kuipata katalogi hiyo. Huenda kiungo kimeandikwa vibaya, au duka halijaorodheshwa tena.',
    inquireAboutDesign: 'Habari! Ninavutiwa na {design}. Unaweza kunishonea kitu kama hiki?',
    inquireAboutDesignPriced:
      'Habari! Ninavutiwa na {design} ({price}). Unaweza kunishonea kitu kama hiki?',
    inquireDesignPinned: 'Kuhusu {design}',
  },
  ar: {
    // ── الواجهة ────────────────────────────────────────────────────────────
    title: 'اكتشف',
    subtitle: 'أعمال حقيقية، من خيّاطين حقيقيين قريبين منك.',
    emptyTitle: 'لا شيء هنا بعد',
    emptyBody:
      'لا يزال الخيّاطون يضيفون أعمالهم. عُد بعد قليل — تمتلئ الواجهة كلما نشروا.',
    filterAll: 'الكل',
    filterWomen: 'نساء',
    filterMen: 'رجال',
    filterUnisex: 'للجنسين',
    filterChildren: 'أطفال',
    occasionWedding: 'زفاف',
    occasionTraditional: 'تقليدي',
    occasionCorporate: 'رسمي',
    occasionCasual: 'يومي',
    occasionParty: 'حفلة',
    clearFilters: 'مسح',
    searchPlaceholder: 'ابحث في القصّات والأقمشة والأثواب…',
    noMatch: 'لا شيء يطابق هذه التصفية بعد.',

    // ── تفاصيل التصميم ─────────────────────────────────────────────────────
    byTailor: 'بواسطة {name}',
    verified: 'موثّق',
    repliesIn: 'يردّ عادةً خلال {hours} ساعة',
    acceptsRemote: 'يعمل مع عملاء في أي مكان',
    fromPrice: 'ابتداءً من {price}',
    inquire: 'اسأل عن هذا',
    save: 'حفظ',
    saved: 'محفوظ',
    moreLikeThis: 'المزيد مثل هذا',
    viewTailor: 'شاهد المزيد من أعماله',

    // ── واجهة الورشة ───────────────────────────────────────────────────────
    storefrontWorks: 'أعماله',
    storefrontEmpty: 'لا شيء منشور بعد.',
    memberSince: 'على SeamFlow منذ {date}',
    specialties: 'التخصّصات',
    speaks: 'يتحدّث',

    // ── الاستفسار ──────────────────────────────────────────────────────────
    inquireTitle: 'اسأل عن هذه القطعة',
    inquireBody:
      'أرسل رسالة إلى {name}. سيرى التصميم الذي تسأل عنه، ويمكنكما التفاهم هنا.',
    inquirePlaceholder: 'مرحبًا! هل يمكنك أن تخيط لي شيئًا كهذا؟',
    inquireSend: 'إرسال الرسالة',
    inquireSending: 'يُرسل…',
    inquireSignInTitle: 'سجّل الدخول لإرسال رسالة',
    inquireSignInBody:
      'يمكنك تصفّح كل شيء دون حساب. تسجيل الدخول فقط ليتمكّن الخيّاطون من الردّ عليك.',
    inquireSignIn: 'تسجيل الدخول',

    // ── التنقّل ────────────────────────────────────────────────────────────
    tabDiscover: 'اكتشف',
    tabMessages: 'الرسائل',
    tabOrders: 'طلباتي',
    catalogueNotFound:
      'لم نتمكّن من إيجاد ذلك الكتالوج. قد يكون الرابط مكتوبًا بشكل خاطئ، أو لم تعد الورشة مُدرجة.',
    inquireAboutDesign: 'مرحبًا! يعجبني {design}. هل يمكنك أن تخيط لي شيئًا كهذا؟',
    inquireAboutDesignPriced:
      'مرحبًا! يعجبني {design} ({price}). هل يمكنك أن تخيط لي شيئًا كهذا؟',
    inquireDesignPinned: 'عن {design}',
  },
} as const;
