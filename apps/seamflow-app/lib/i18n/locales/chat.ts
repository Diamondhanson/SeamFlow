// In-app chat with clients (ROADMAP D.4.3). Distinct from the AI assistant —
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
    designFromPrice: 'From {price}',
    aboutDesignShort: 'About {design}',
    aDesign: 'a design',
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
    designFromPrice: 'À partir de {price}',
    aboutDesignShort: 'À propos de {design}',
    aDesign: 'une création',
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
    designFromPrice: 'A partir de {price}',
    aboutDesignShort: 'Sobre {design}',
    aDesign: 'uma criação',
  },
} as const;
