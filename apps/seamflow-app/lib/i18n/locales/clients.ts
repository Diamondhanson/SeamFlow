// Filled in during the app-wide i18n pass. English is the source of truth;
// French mirrors it. Keys are camelCase and referenced as t('clients.key').
export const clients = {
  en: {
    // clients list
    title: 'Clients',
    contactTitle: 'Contact client',
    callAction: 'Call',
    whatsappAction: 'WhatsApp',
    smsAction: 'Text message',
    newClientA11y: 'New client',
    searchPlaceholder: 'Search name or phone…',
    emptyList: 'No clients yet. Tap + to add one.',
    profileRequiredTitle: 'Profile required',
    profileRequiredBody: 'Set up your business profile first.',
    goToProfile: 'Go to profile',

    // new client
    newClientTitle: 'New client',
    fullNameLabel: 'Full name *',
    fullNamePlaceholder: 'Adaeze Okeke',
    phoneLabel: 'Phone *',
    addressLabel: 'Address *',
    addressPlaceholder: 'Bonanjo, Douala',
    createClient: 'Create client',

    // client detail
    clientTitle: 'Client',
    measurementSets: 'Measurement sets',
    addSet: '+ Add',
    noMeasurementSets: 'No measurement sets yet.',
    labelLabel: 'Label',
    valuesLabel: 'Values (JSON object, cm)',
    saveSet: 'Save set',
    ordersCount: 'Orders ({count})',
    noOrders: 'No orders for this client yet.',
    statusLine: 'Status: {status}',
    deliveryLine: 'Delivery: {date}',
    deleteClient: 'Delete client',
    invalidJsonTitle: 'Invalid JSON',
    invalidJsonBody: 'Measurements must be a JSON object of numbers.',
    deleteClientTitle: 'Delete client?',
    deleteConfirmBody: '{name} will be deleted.',

    // swipeable row
    deleteConfirmBodyPermanent: "{name} will be permanently deleted. This can't be undone.",
    couldNotDelete: 'Could not delete',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
  },
  fr: {
    // clients list
    title: 'Clients',
    contactTitle: 'Contacter le client',
    callAction: 'Appeler',
    whatsappAction: 'WhatsApp',
    smsAction: 'SMS',
    newClientA11y: 'Nouveau client',
    searchPlaceholder: 'Rechercher un nom ou un téléphone…',
    emptyList: 'Aucun client pour le moment. Appuyez sur + pour en ajouter un.',
    profileRequiredTitle: 'Profil requis',
    profileRequiredBody: "Configurez d'abord votre profil professionnel.",
    goToProfile: 'Aller au profil',

    // new client
    newClientTitle: 'Nouveau client',
    fullNameLabel: 'Nom complet *',
    fullNamePlaceholder: 'Adaeze Okeke',
    phoneLabel: 'Téléphone *',
    addressLabel: 'Adresse *',
    addressPlaceholder: 'Bonanjo, Douala',
    createClient: 'Créer le client',

    // client detail
    clientTitle: 'Client',
    measurementSets: 'Jeux de mesures',
    addSet: '+ Ajouter',
    noMeasurementSets: 'Aucun jeu de mesures pour le moment.',
    labelLabel: 'Libellé',
    valuesLabel: 'Valeurs (objet JSON, cm)',
    saveSet: 'Enregistrer le jeu',
    ordersCount: 'Commandes ({count})',
    noOrders: 'Aucune commande pour ce client pour le moment.',
    statusLine: 'Statut : {status}',
    deliveryLine: 'Livraison : {date}',
    deleteClient: 'Supprimer le client',
    invalidJsonTitle: 'JSON invalide',
    invalidJsonBody: 'Les mesures doivent être un objet JSON de nombres.',
    deleteClientTitle: 'Supprimer le client ?',
    deleteConfirmBody: '{name} sera supprimé.',

    // swipeable row
    deleteConfirmBodyPermanent: '{name} sera définitivement supprimé. Cette action est irréversible.',
    couldNotDelete: 'Suppression impossible',
    favorite: 'Favori',
    unfavorite: 'Retirer des favoris',
  },
} as const;
