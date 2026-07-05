// Filled in during the app-wide i18n pass. English is the source of truth;
// French mirrors it. Keys are camelCase and referenced as t('orders.key').
export const orders = {
  en: {
    // Screen headers
    listTitle: 'Orders',
    newOrder: 'New order',
    detailTitle: 'Order',
    newTitle: 'New order',

    // Status labels (displayed value; enum keys stay as data)
    status_registered: 'Registered',
    status_in_progress: 'In progress',
    status_testing: 'Testing / fitting',
    status_on_pause: 'On pause',
    status_delivered: 'Delivered',

    // Orders list
    searchPlaceholder: 'Search orders…',
    filterAll: 'All',
    filterAllTime: 'All time',
    filterOverdue: 'Overdue',
    filterDueThisWeek: 'Due this week',
    statusSheetTitle: 'Filter by status',
    dueSheetTitle: 'Filter by due date',
    emptyNoMatch: 'No orders match those filters.',

    // Wizard steps
    stepClient: 'Client',
    stepMeasurements: 'Measurements',
    stepOrder: 'Order',

    // Step 1: client
    searchExistingClients: 'Search existing clients',
    searchClientsPlaceholder: 'Name or phone',
    selectFromContacts: 'Select from contacts',
    newClient: '+ New client',
    fullNameLabel: 'Full name *',
    phoneLabel: 'Phone *',
    addressLabel: 'Address *',
    addressPlaceholder: 'Bonanjo, Douala',
    createAndContinue: 'Create + continue',
    existingClients: 'Existing clients',
    noClientsYet: 'No clients yet.',

    // Step 2: measurements
    clientLabel: 'Client: {name}',
    pickTemplate: 'Pick a template',
    templateHint:
      'Templates define which measurements to ask for. Skip if you want loose entries.',
    usingTemplate: 'Using: {name}',
    noTemplateSkip: 'No template (skip)',
    noTemplateOption: 'No template',
    measurementsCm: 'Measurements (cm)',
    manualMeasurementsCm: 'Manual measurements (cm)',
    measurementPlaceholder: 'e.g. 88',
    addFieldLabel: 'Add a field (e.g. chest)',
    nextOrder: 'Next: order',
    requiredFieldTitle: 'Required field',
    requiredFieldMessage: '{label} is required by this template.',

    // Step 3: order
    orderNameLabel: 'Order name *',
    orderNamePlaceholder: 'Aso ebi outfit, Suit for wedding…',
    deliveryDate: 'Delivery date',
    notesLabel: 'Notes / design specifications',

    // Order detail
    orderedLabel: 'Ordered: {date}',
    deliveryLabel: 'Delivery: {date}',
    ordered: 'Ordered',
    delivery: 'Delivery',
    generatingLink: 'Generating link…',
    shareWithClient: 'Share with client',
    statusSection: 'Status',
    noNextStatus: 'No next status available.',
    transitionTo: '→ {label}',
    photosCount: 'Photos ({count})',
    camera: 'Camera',
    gallery: 'Gallery',
    noPhotosYet: 'No photos yet.',
    longPressToDelete: 'Long-press a photo to delete.',
    deletePhotoTitle: 'Delete photo?',
    deletePhotoMessage: 'This cannot be undone.',
    itemsCount: 'Items ({count})',
    noItems: 'No items.',
    qtyLabel: 'Qty: {count}',
    measurementLine: '{key}: {value} cm',
    timelineCount: 'Timeline ({count})',
    noEventsYet: 'No events yet.',
    orderCreated: 'Order created',
    statusTransition: '{from} → {to}',
    deleteOrder: 'Delete order',
    deleteOrderTitle: 'Delete order?',
    deleteOrderMessage: '{name} will be permanently deleted.',
  },
  fr: {
    // Screen headers
    listTitle: 'Commandes',
    newOrder: 'Nouvelle commande',
    detailTitle: 'Commande',
    newTitle: 'Nouvelle commande',

    // Status labels
    status_registered: 'Enregistrée',
    status_in_progress: 'En cours',
    status_testing: 'Essayage',
    status_on_pause: 'En pause',
    status_delivered: 'Livrée',

    // Orders list
    searchPlaceholder: 'Rechercher des commandes…',
    filterAll: 'Toutes',
    filterAllTime: 'Toutes les dates',
    filterOverdue: 'En retard',
    filterDueThisWeek: 'Cette semaine',
    statusSheetTitle: 'Filtrer par statut',
    dueSheetTitle: 'Filtrer par échéance',
    emptyNoMatch: 'Aucune commande ne correspond à ces filtres.',

    // Wizard steps
    stepClient: 'Client',
    stepMeasurements: 'Mesures',
    stepOrder: 'Commande',

    // Step 1: client
    searchExistingClients: 'Rechercher un client existant',
    searchClientsPlaceholder: 'Nom ou téléphone',
    selectFromContacts: 'Choisir dans les contacts',
    newClient: '+ Nouveau client',
    fullNameLabel: 'Nom complet *',
    phoneLabel: 'Téléphone *',
    addressLabel: 'Adresse *',
    addressPlaceholder: 'Bonanjo, Douala',
    createAndContinue: 'Créer + continuer',
    existingClients: 'Clients existants',
    noClientsYet: 'Aucun client pour le moment.',

    // Step 2: measurements
    clientLabel: 'Client : {name}',
    pickTemplate: 'Choisir un modèle',
    templateHint:
      'Les modèles définissent les mesures à demander. Ignorez pour des saisies libres.',
    usingTemplate: 'Modèle : {name}',
    noTemplateSkip: 'Aucun modèle (ignorer)',
    noTemplateOption: 'Aucun modèle',
    measurementsCm: 'Mesures (cm)',
    manualMeasurementsCm: 'Mesures manuelles (cm)',
    measurementPlaceholder: 'ex. 88',
    addFieldLabel: 'Ajouter un champ (ex. poitrine)',
    nextOrder: 'Suivant : commande',
    requiredFieldTitle: 'Champ obligatoire',
    requiredFieldMessage: '{label} est requis par ce modèle.',

    // Step 3: order
    orderNameLabel: 'Nom de la commande *',
    orderNamePlaceholder: 'Tenue aso ebi, costume de mariage…',
    deliveryDate: 'Date de livraison',
    notesLabel: 'Notes / spécifications de conception',

    // Order detail
    orderedLabel: 'Commandée : {date}',
    deliveryLabel: 'Livraison : {date}',
    ordered: 'Commandée',
    delivery: 'Livraison',
    generatingLink: 'Génération du lien…',
    shareWithClient: 'Partager avec le client',
    statusSection: 'Statut',
    noNextStatus: 'Aucun statut suivant disponible.',
    transitionTo: '→ {label}',
    photosCount: 'Photos ({count})',
    camera: 'Caméra',
    gallery: 'Galerie',
    noPhotosYet: 'Aucune photo pour le moment.',
    longPressToDelete: 'Appui long sur une photo pour la supprimer.',
    deletePhotoTitle: 'Supprimer la photo ?',
    deletePhotoMessage: 'Cette action est irréversible.',
    itemsCount: 'Articles ({count})',
    noItems: 'Aucun article.',
    qtyLabel: 'Qté : {count}',
    measurementLine: '{key} : {value} cm',
    timelineCount: 'Chronologie ({count})',
    noEventsYet: 'Aucun événement pour le moment.',
    orderCreated: 'Commande créée',
    statusTransition: '{from} → {to}',
    deleteOrder: 'Supprimer la commande',
    deleteOrderTitle: 'Supprimer la commande ?',
    deleteOrderMessage: '{name} sera définitivement supprimée.',
  },
} as const;
