// In-app chat with tailors (ROADMAP D.4.3). Distinct from the AI assistant —
// this is human ↔ human. English is the source of truth; French mirrors it.
export const chat = {
  en: {
    // ── Tab + list ──────────────────────────────────────────────────────────
    tabLabel: 'Messages',
    tabSubtitle: 'Enquiries · chat',
    listTitle: 'Messages',
    listSubtitle: 'Enquiries from people who found your work.',

    // The honest empty state: clients genuinely cannot reach the tailor until
    // the client app ships, and pretending otherwise wastes their time.
    emptyTitle: 'No enquiries yet',
    emptyBody:
      'When the SeamFlow client app launches, people browsing your published work will be able to message you here. Publishing your finished orders now means you’ll have something for them to find.',
    emptyCta: 'Show your work in the feed',

    unreadBadge: '{count} new',
    youPrefix: 'You: ',
    imageMessage: 'Photo',
    designMessage: 'A design',

    // ── Thread ──────────────────────────────────────────────────────────────
    threadTitle: 'Conversation',
    aboutDesign: 'About this design',
    composerPlaceholder: 'Write a message…',
    send: 'Send',
    sending: 'Sending…',
    failedToSend: 'Not sent',
    retry: 'Retry',
    retryAll: 'Retry all',
    tapToRetry: 'Tap to try again',
    queuedOffline: 'Waiting for a connection',
    offlineBanner: 'You’re offline — messages will send when you’re back.',
    loadingOlder: 'Loading older messages…',
    startOfConversation: 'This is the start of your conversation.',
    typing: 'Typing…',
    online: 'Online',
    lastSeenRecently: 'Last seen recently',
    readReceipt: 'Read',
    deliveredReceipt: 'Sent',

    // Day separators
    today: 'Today',
    yesterday: 'Yesterday',

    // ── Attachments ─────────────────────────────────────────────────────────
    attach: 'Add a photo',
    attachTakePhoto: 'Take photo',
    attachFromGallery: 'Choose from gallery',
    attachmentFailed: 'Couldn’t attach that photo',
    uploadingAttachment: 'Adding photo…',

    // ── Quote (C3) ──────────────────────────────────────────────────────────
    createQuote: 'Create order',
    createQuoteTitle: 'Turn this into an order',
    createQuoteBody:
      'Creates an order and a draft invoice linked to this conversation. It then behaves like any other order.',
    quoteOrderNameLabel: 'Order title *',
    quoteOrderNamePlaceholder: 'e.g. Wedding agbada for Amina',
    quoteDeliveryLabel: 'Delivery date',
    quoteAmountLabel: 'Price (optional)',
    quoteNotesLabel: 'Notes',
    quoteNotesPlaceholder: 'What was agreed in the chat…',
    quoteClientNameLabel: 'Client name',
    quoteClientNameHelp:
      'They’re not in your client list yet — this is the name we’ll save them under.',
    quoteClientPhoneLabel: 'Client phone',
    quoteSubmit: 'Create order',
    quoteCreating: 'Creating…',
    quoteCreatedTitle: 'Order created',
    quoteCreatedBody: 'An order and draft invoice are linked to this conversation.',
    quoteFailed: 'Couldn’t create the order',
    viewOrder: 'View order',
    linkedOrder: 'Linked to an order',

    // ── Dev-only helper ─────────────────────────────────────────────────────
    // Lets us prove the whole loop before the client app exists. Hidden in
    // production builds.
    devSimulate: 'Simulate a client enquiry',
    devSimulateBody:
      'Development only. Creates a fake inbound enquiry so the chat can be tested end to end before the client app ships.',
    devSimulateDone: 'Simulated enquiry created',
  },
  fr: {
    tabLabel: 'Messages',
    tabSubtitle: 'Demandes · discussion',
    listTitle: 'Messages',
    listSubtitle: 'Les demandes des personnes qui ont vu votre travail.',

    emptyTitle: 'Aucune demande pour l’instant',
    emptyBody:
      'Au lancement de l’application client SeamFlow, les personnes qui parcourent vos réalisations pourront vous écrire ici. Publier vos commandes terminées dès maintenant, c’est leur donner quelque chose à découvrir.',
    emptyCta: 'Afficher votre travail dans le fil',

    unreadBadge: '{count} nouveau(x)',
    youPrefix: 'Vous : ',
    imageMessage: 'Photo',
    designMessage: 'Un modèle',

    threadTitle: 'Conversation',
    aboutDesign: 'À propos de ce modèle',
    composerPlaceholder: 'Écrivez un message…',
    send: 'Envoyer',
    sending: 'Envoi…',
    failedToSend: 'Non envoyé',
    retry: 'Réessayer',
    retryAll: 'Tout réessayer',
    tapToRetry: 'Touchez pour réessayer',
    queuedOffline: 'En attente de connexion',
    offlineBanner: 'Vous êtes hors ligne — les messages partiront au retour du réseau.',
    loadingOlder: 'Chargement des messages plus anciens…',
    startOfConversation: 'C’est le début de votre conversation.',
    typing: 'En train d’écrire…',
    online: 'En ligne',
    lastSeenRecently: 'Vu récemment',
    readReceipt: 'Lu',
    deliveredReceipt: 'Envoyé',

    today: 'Aujourd’hui',
    yesterday: 'Hier',

    attach: 'Ajouter une photo',
    attachTakePhoto: 'Prendre une photo',
    attachFromGallery: 'Choisir dans la galerie',
    attachmentFailed: 'Impossible de joindre cette photo',
    uploadingAttachment: 'Ajout de la photo…',

    createQuote: 'Créer une commande',
    createQuoteTitle: 'Transformer en commande',
    createQuoteBody:
      'Crée une commande et une facture brouillon liées à cette conversation. Elle se comporte ensuite comme n’importe quelle commande.',
    quoteOrderNameLabel: 'Titre de la commande *',
    quoteOrderNamePlaceholder: 'ex. Agbada de mariage pour Amina',
    quoteDeliveryLabel: 'Date de livraison',
    quoteAmountLabel: 'Prix (facultatif)',
    quoteNotesLabel: 'Notes',
    quoteNotesPlaceholder: 'Ce qui a été convenu dans la discussion…',
    quoteClientNameLabel: 'Nom du client',
    quoteClientNameHelp:
      'Cette personne n’est pas encore dans vos clients — voici le nom sous lequel nous l’enregistrerons.',
    quoteClientPhoneLabel: 'Téléphone du client',
    quoteSubmit: 'Créer la commande',
    quoteCreating: 'Création…',
    quoteCreatedTitle: 'Commande créée',
    quoteCreatedBody:
      'Une commande et une facture brouillon sont liées à cette conversation.',
    quoteFailed: 'Impossible de créer la commande',
    viewOrder: 'Voir la commande',
    linkedOrder: 'Liée à une commande',

    devSimulate: 'Simuler une demande client',
    devSimulateBody:
      'Développement uniquement. Crée une fausse demande entrante pour tester la discussion de bout en bout avant la sortie de l’application client.',
    devSimulateDone: 'Demande simulée créée',
  },
  pt: {
    // ── Separador + lista ───────────────────────────────────────────────────
    tabLabel: 'Mensagens',
    tabSubtitle: 'Pedidos · conversa',
    listTitle: 'Mensagens',
    listSubtitle: 'Pedidos de quem encontrou o seu trabalho.',

    emptyTitle: 'Ainda sem pedidos',
    emptyBody:
      'Quando a aplicação para clientes do SeamFlow for lançada, quem estiver a ver o seu trabalho publicado poderá enviar-lhe mensagem aqui. Publicar agora as encomendas terminadas significa que terão algo para descobrir.',
    emptyCta: 'Mostrar o seu trabalho no feed',

    unreadBadge: '{count} novas',
    youPrefix: 'Você: ',
    imageMessage: 'Foto',
    designMessage: 'Uma criação',

    // ── Conversa ────────────────────────────────────────────────────────────
    threadTitle: 'Conversa',
    aboutDesign: 'Sobre esta criação',
    composerPlaceholder: 'Escreva uma mensagem…',
    send: 'Enviar',
    sending: 'A enviar…',
    failedToSend: 'Não enviada',
    retry: 'Tentar novamente',
    retryAll: 'Repetir todas',
    tapToRetry: 'Toque para tentar de novo',
    queuedOffline: 'À espera de ligação',
    offlineBanner: 'Está offline — as mensagens serão enviadas quando voltar.',
    loadingOlder: 'A carregar mensagens antigas…',
    startOfConversation: 'Este é o início da vossa conversa.',
    typing: 'A escrever…',
    online: 'Online',
    lastSeenRecently: 'Visto há pouco',
    readReceipt: 'Lida',
    deliveredReceipt: 'Enviada',

    // Separadores de dia
    today: 'Hoje',
    yesterday: 'Ontem',

    // ── Anexos ──────────────────────────────────────────────────────────────
    attach: 'Adicionar uma foto',
    attachTakePhoto: 'Tirar foto',
    attachFromGallery: 'Escolher da galeria',
    attachmentFailed: 'Não foi possível anexar essa foto',
    uploadingAttachment: 'A adicionar foto…',

    // ── Orçamento ───────────────────────────────────────────────────────────
    createQuote: 'Criar encomenda',
    createQuoteTitle: 'Transformar isto numa encomenda',
    createQuoteBody:
      'Cria uma encomenda e um rascunho de fatura ligados a esta conversa. Depois comporta-se como qualquer outra encomenda.',
    quoteOrderNameLabel: 'Título da encomenda *',
    quoteOrderNamePlaceholder: 'ex. Agbada de casamento para a Amina',
    quoteDeliveryLabel: 'Data de entrega',
    quoteAmountLabel: 'Preço (opcional)',
    quoteNotesLabel: 'Notas',
    quoteNotesPlaceholder: 'O que ficou combinado na conversa…',
    quoteClientNameLabel: 'Nome do cliente',
    quoteClientNameHelp:
      'Ainda não está na sua lista de clientes — é com este nome que o vamos guardar.',
    quoteClientPhoneLabel: 'Telefone do cliente',
    quoteSubmit: 'Criar encomenda',
    quoteCreating: 'A criar…',
    quoteCreatedTitle: 'Encomenda criada',
    quoteCreatedBody:
      'Uma encomenda e um rascunho de fatura estão ligados a esta conversa.',
    quoteFailed: 'Não foi possível criar a encomenda',
    viewOrder: 'Ver encomenda',
    linkedOrder: 'Ligada a uma encomenda',

    // ── Apenas em desenvolvimento ───────────────────────────────────────────
    devSimulate: 'Simular um pedido de cliente',
    devSimulateBody:
      'Apenas em desenvolvimento. Cria um pedido falso para testar a conversa de ponta a ponta antes de a aplicação para clientes ser lançada.',
    devSimulateDone: 'Pedido simulado criado',
  },
  es: {
    tabLabel: 'Mensajes',
    tabSubtitle: 'Consultas · chat',
    listTitle: 'Mensajes',
    listSubtitle: 'Consultas de personas que encontraron su trabajo.',

    emptyTitle: 'Aún no hay consultas',
    emptyBody:
      'Cuando se lance la app de clientes de SeamFlow, quienes vean su trabajo publicado podrán escribirle aquí. Publicar sus pedidos terminados ahora significa que tendrán algo que encontrar.',
    emptyCta: 'Muestre su trabajo en el muro',

    unreadBadge: '{count} nuevos',
    youPrefix: 'Usted: ',
    imageMessage: 'Foto',
    designMessage: 'Un diseño',

    // ── Conversación ────────────────────────────────────────────────────────
    threadTitle: 'Conversación',
    aboutDesign: 'Sobre este diseño',
    composerPlaceholder: 'Escriba un mensaje…',
    send: 'Enviar',
    sending: 'Enviando…',
    failedToSend: 'No enviado',
    retry: 'Reintentar',
    retryAll: 'Reintentar todo',
    tapToRetry: 'Toque para intentar de nuevo',
    queuedOffline: 'Esperando conexión',
    offlineBanner: 'Está sin conexión — los mensajes se enviarán cuando vuelva.',
    loadingOlder: 'Cargando mensajes anteriores…',
    startOfConversation: 'Aquí empieza su conversación.',
    typing: 'Escribiendo…',
    online: 'En línea',
    lastSeenRecently: 'Visto hace poco',
    readReceipt: 'Leído',
    deliveredReceipt: 'Enviado',

    // Separadores de día
    today: 'Hoy',
    yesterday: 'Ayer',

    // ── Adjuntos ────────────────────────────────────────────────────────────
    attach: 'Agregar una foto',
    attachTakePhoto: 'Tomar foto',
    attachFromGallery: 'Elegir de la galería',
    attachmentFailed: 'No se pudo adjuntar esa foto',
    uploadingAttachment: 'Agregando la foto…',

    // ── Cotización (C3) ─────────────────────────────────────────────────────
    createQuote: 'Crear pedido',
    createQuoteTitle: 'Convierta esto en un pedido',
    createQuoteBody:
      'Crea un pedido y una factura en borrador vinculados a esta conversación. Después funciona como cualquier otro pedido.',
    quoteOrderNameLabel: 'Título del pedido *',
    quoteOrderNamePlaceholder: 'p. ej. Agbada de boda para Amina',
    quoteDeliveryLabel: 'Fecha de entrega',
    quoteAmountLabel: 'Precio (opcional)',
    quoteNotesLabel: 'Notas',
    quoteNotesPlaceholder: 'Lo que se acordó en el chat…',
    quoteClientNameLabel: 'Nombre del cliente',
    quoteClientNameHelp:
      'Todavía no está en su lista de clientes — este es el nombre con el que lo guardaremos.',
    quoteClientPhoneLabel: 'Teléfono del cliente',
    quoteSubmit: 'Crear pedido',
    quoteCreating: 'Creando…',
    quoteCreatedTitle: 'Pedido creado',
    quoteCreatedBody: 'Un pedido y una factura en borrador quedaron vinculados a esta conversación.',
    quoteFailed: 'No se pudo crear el pedido',
    viewOrder: 'Ver pedido',
    linkedOrder: 'Vinculado a un pedido',

    // ── Ayuda solo para desarrollo ──────────────────────────────────────────
    devSimulate: 'Simular una consulta de cliente',
    devSimulateBody:
      'Solo para desarrollo. Crea una consulta entrante falsa para probar el chat de principio a fin antes de que salga la app de clientes.',
    devSimulateDone: 'Consulta simulada creada',
  },
  sw: {
    tabLabel: 'Ujumbe',
    tabSubtitle: 'Maulizo · mazungumzo',
    listTitle: 'Ujumbe',
    listSubtitle: 'Maulizo kutoka kwa watu waliokutana na kazi yako.',

    emptyTitle: 'Bado hakuna maulizo',
    emptyBody:
      'Programu ya wateja ya SeamFlow itakapozinduliwa, watu wanaotazama kazi yako iliyochapishwa wataweza kukuandikia hapa. Kuchapisha maagizo yako yaliyokamilika sasa kunamaanisha watakuwa na kitu cha kukuta.',
    emptyCta: 'Onyesha kazi yako kwenye mkondo',

    unreadBadge: 'Mpya {count}',
    youPrefix: 'Wewe: ',
    imageMessage: 'Picha',
    designMessage: 'Ubunifu',

    // ── Mazungumzo ──────────────────────────────────────────────────────────
    threadTitle: 'Mazungumzo',
    aboutDesign: 'Kuhusu ubunifu huu',
    composerPlaceholder: 'Andika ujumbe…',
    send: 'Tuma',
    sending: 'Inatuma…',
    failedToSend: 'Haujatumwa',
    retry: 'Jaribu tena',
    retryAll: 'Jaribu yote tena',
    tapToRetry: 'Gusa ujaribu tena',
    queuedOffline: 'Inasubiri muunganisho',
    offlineBanner: 'Huna mtandao — ujumbe utatumwa utakaporudi.',
    loadingOlder: 'Inapakia ujumbe wa zamani…',
    startOfConversation: 'Hapa ndipo mazungumzo yenu yanaanzia.',
    typing: 'Anaandika…',
    online: 'Yupo mtandaoni',
    lastSeenRecently: 'Alionekana hivi karibuni',
    readReceipt: 'Umesomwa',
    deliveredReceipt: 'Umetumwa',

    // Vitenganishi vya siku
    today: 'Leo',
    yesterday: 'Jana',

    // ── Viambatisho ─────────────────────────────────────────────────────────
    attach: 'Ongeza picha',
    attachTakePhoto: 'Piga picha',
    attachFromGallery: 'Chagua kutoka matunzio',
    attachmentFailed: 'Haikuwezekana kuambatisha picha hiyo',
    uploadingAttachment: 'Inaongeza picha…',

    // ── Nukuu ya bei (C3) ───────────────────────────────────────────────────
    createQuote: 'Tengeneza agizo',
    createQuoteTitle: 'Geuza haya kuwa agizo',
    createQuoteBody:
      'Hutengeneza agizo na rasimu ya ankara vilivyounganishwa na mazungumzo haya. Kisha hufanya kazi kama agizo lingine lolote.',
    quoteOrderNameLabel: 'Kichwa cha agizo *',
    quoteOrderNamePlaceholder: 'mf. Agbada ya harusi kwa Amina',
    quoteDeliveryLabel: 'Tarehe ya kukabidhi',
    quoteAmountLabel: 'Bei (si lazima)',
    quoteNotesLabel: 'Maelezo',
    quoteNotesPlaceholder: 'Mliyokubaliana kwenye mazungumzo…',
    quoteClientNameLabel: 'Jina la mteja',
    quoteClientNameHelp:
      'Bado hayupo kwenye orodha yako ya wateja — hili ndilo jina tutakalomhifadhi nalo.',
    quoteClientPhoneLabel: 'Simu ya mteja',
    quoteSubmit: 'Tengeneza agizo',
    quoteCreating: 'Inatengeneza…',
    quoteCreatedTitle: 'Agizo limetengenezwa',
    quoteCreatedBody: 'Agizo na rasimu ya ankara vimeunganishwa na mazungumzo haya.',
    quoteFailed: 'Haikuwezekana kutengeneza agizo',
    viewOrder: 'Ona agizo',
    linkedOrder: 'Limeunganishwa na agizo',

    // ── Kisaidizi cha maendeleo pekee ───────────────────────────────────────
    devSimulate: 'Iga ulizo la mteja',
    devSimulateBody:
      'Kwa maendeleo pekee. Hutengeneza ulizo bandia linaloingia ili mazungumzo yajaribiwe kikamilifu kabla programu ya wateja haijatoka.',
    devSimulateDone: 'Ulizo la kuiga limetengenezwa',
  },
  ar: {
    tabLabel: 'الرسائل',
    tabSubtitle: 'استفسارات · محادثة',
    listTitle: 'الرسائل',
    listSubtitle: 'استفسارات ممّن وجدوا أعمالك.',

    emptyTitle: 'لا استفسارات بعد',
    emptyBody:
      'عند إطلاق تطبيق عملاء SeamFlow، سيتمكّن من يتصفّح أعمالك المنشورة من مراسلتك هنا. نشر طلباتك المنجزة الآن يعني أن يجدوا شيئًا حين يأتون.',
    emptyCta: 'اعرض أعمالك في الواجهة',

    unreadBadge: '{count} جديد',
    youPrefix: 'أنت: ',
    imageMessage: 'صورة',
    designMessage: 'تصميم',

    threadTitle: 'محادثة',
    aboutDesign: 'عن هذا التصميم',
    composerPlaceholder: 'اكتب رسالة…',
    send: 'إرسال',
    sending: 'يُرسل…',
    failedToSend: 'لم تُرسل',
    retry: 'إعادة المحاولة',
    retryAll: 'إعادة محاولة الكل',
    tapToRetry: 'انقر للمحاولة مرة أخرى',
    queuedOffline: 'بانتظار الاتصال',
    offlineBanner: 'أنت دون اتصال — ستُرسل الرسائل عند عودتك.',
    loadingOlder: 'يحمّل رسائل أقدم…',
    startOfConversation: 'هنا تبدأ محادثتكما.',
    typing: 'يكتب…',
    online: 'متصل',
    lastSeenRecently: 'شوهد مؤخرًا',
    readReceipt: 'مقروءة',
    deliveredReceipt: 'أُرسلت',

    today: 'اليوم',
    yesterday: 'أمس',

    attach: 'إضافة صورة',
    attachTakePhoto: 'التقاط صورة',
    attachFromGallery: 'اختيار من المعرض',
    attachmentFailed: 'تعذّر إرفاق تلك الصورة',
    uploadingAttachment: 'يضيف الصورة…',

    createQuote: 'إنشاء طلب',
    createQuoteTitle: 'حوّل هذا إلى طلب',
    createQuoteBody:
      'يُنشئ طلبًا ومسودّة فاتورة مرتبطتين بهذه المحادثة. ثم يعمل كأي طلب آخر.',
    quoteOrderNameLabel: 'عنوان الطلب *',
    quoteOrderNamePlaceholder: 'مثال: أغبادا زفاف لأمينة',
    quoteDeliveryLabel: 'موعد التسليم',
    quoteAmountLabel: 'السعر (اختياري)',
    quoteNotesLabel: 'ملاحظات',
    quoteNotesPlaceholder: 'ما اتُّفق عليه في المحادثة…',
    quoteClientNameLabel: 'اسم العميل',
    quoteClientNameHelp:
      'ليس في قائمة عملائك بعد — هذا هو الاسم الذي سنحفظه به.',
    quoteClientPhoneLabel: 'هاتف العميل',
    quoteSubmit: 'إنشاء الطلب',
    quoteCreating: 'يُنشئ…',
    quoteCreatedTitle: 'أُنشئ الطلب',
    quoteCreatedBody: 'رُبط طلب ومسودّة فاتورة بهذه المحادثة.',
    quoteFailed: 'تعذّر إنشاء الطلب',
    viewOrder: 'عرض الطلب',
    linkedOrder: 'مرتبط بطلب',

    devSimulate: 'محاكاة استفسار عميل',
    devSimulateBody:
      'للتطوير فقط. يُنشئ استفسارًا واردًا وهميًا لاختبار المحادثة كاملة قبل صدور تطبيق العملاء.',
    devSimulateDone: 'أُنشئ استفسار محاكى',
  },
} as const;
