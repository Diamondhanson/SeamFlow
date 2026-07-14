// Filled in during the app-wide i18n pass. English is the source of truth;
// French mirrors it. Keys are camelCase and referenced as t('misc.key').
export const misc = {
  en: {
    // PIN settings screen
    pinLockTitle: 'PIN lock',
    appPinLock: 'App PIN lock',
    pinSetDescription:
      'A PIN is set. The app will lock after 5 minutes in the background.',
    noPinDescription:
      'No PIN set. The app will not lock when you switch away.',
    changePin: 'Change PIN',
    removePin: 'Remove PIN',
    lockNow: 'Lock now',
    setAPin: 'Set a PIN',
    wrongPinTitle: 'Wrong PIN',
    tryAgain: 'Try again.',
    removePinTitle: 'Remove PIN?',
    removePinBody: 'You can re-add it later from this screen.',
    pinRemovedTitle: 'PIN removed',
    pinRemovedBody: 'The app will no longer lock.',
    pinsDontMatchTitle: "PINs don't match",
    pinSetTitle: 'PIN set',
    pinChangedTitle: 'PIN changed',
    pinSavedBody:
      'The app will now ask for this PIN if you leave it idle for a few minutes.',
    enterCurrentPin: 'Enter your current PIN',
    enterNewPin: 'Enter a new PIN',
    choosePin: 'Choose a 4-digit PIN',
    reenterPin: 'Re-enter the PIN to confirm',
    // PIN lock screen
    enterYourPin: 'Enter your PIN',
    tooManyAttemptsTitle: 'Too many attempts',
    tooManyAttemptsBody:
      '{max} wrong tries. Signing you out — please sign in again to continue.',
    wrongPinAttempts: 'Wrong PIN. {left} attempt{plural} left.',
    forgotPinSignOut: 'Forgot PIN? Sign out',
    forgotPinConfirmTitle: 'Reset your PIN?',
    forgotPinConfirmBody:
      "To reset your PIN you'll sign out, then log back in and set a new one. Your work is safe — it stays on your account.",
    forgotPinConfirmCta: 'Sign out',
    // Contact picker
    selectFromContacts: 'Select from contacts',
    searchNameOrNumber: 'Search name or number…',
    noContactsMatch: 'No contacts match.',
    contactsAccessOff:
      "Contacts access is off. Enable it for this app in your phone's Settings to pick clients from your address book.",
    // Permissions
    permissionNeededTitle: 'Permission needed',
    cameraAccessOff:
      "Camera access is off. Enable it for this app in your phone's Settings to take photos.",
    photosAccessOff:
      "Photo access is off. Enable it for this app in your phone's Settings to choose a photo.",
    openSettings: 'Open Settings',
    photosOfflineTitle: "You're offline",
    photosOfflineBody:
      'Photos need a connection to upload. Reconnect and add them then.',
    // Phone input
    phoneNumber: 'Phone number',
    selectCountry: 'Select country',
    searchCountryOrCode: 'Search country or code…',
    selectCountryDialCode: 'Select country dial code',
    // Offline banner
    offlineWithPending:
      'Offline — {count} change{plural} will sync when reconnected',
    youreOffline: "You're offline",
    syncing: 'Syncing {count} change{plural}…',
    // Calendar
    pickADayToSee: 'Pick a day to see its deliveries.',
    today: 'TODAY · ',
    event: 'event',
    events: 'events',
    noDeliveriesThisDay: 'No deliveries due this day.',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    // Date field
    pickADate: 'Pick a date',
    // Search field
    searchPlaceholder: 'Search…',
  },
  fr: {
    // PIN settings screen
    pinLockTitle: 'Verrouillage par code',
    appPinLock: 'Verrouillage de l’application',
    pinSetDescription:
      'Un code est défini. L’application se verrouille après 5 minutes en arrière-plan.',
    noPinDescription:
      'Aucun code défini. L’application ne se verrouille pas lorsque vous la quittez.',
    changePin: 'Modifier le code',
    removePin: 'Supprimer le code',
    lockNow: 'Verrouiller maintenant',
    setAPin: 'Définir un code',
    wrongPinTitle: 'Code incorrect',
    tryAgain: 'Réessayez.',
    removePinTitle: 'Supprimer le code ?',
    removePinBody: 'Vous pourrez le rajouter plus tard depuis cet écran.',
    pinRemovedTitle: 'Code supprimé',
    pinRemovedBody: 'L’application ne se verrouillera plus.',
    pinsDontMatchTitle: 'Les codes ne correspondent pas',
    pinSetTitle: 'Code défini',
    pinChangedTitle: 'Code modifié',
    pinSavedBody:
      'L’application demandera désormais ce code si vous la laissez inactive quelques minutes.',
    enterCurrentPin: 'Saisissez votre code actuel',
    enterNewPin: 'Saisissez un nouveau code',
    choosePin: 'Choisissez un code à 4 chiffres',
    reenterPin: 'Ressaisissez le code pour confirmer',
    // PIN lock screen
    enterYourPin: 'Saisissez votre code',
    tooManyAttemptsTitle: 'Trop de tentatives',
    tooManyAttemptsBody:
      '{max} mauvaises tentatives. Déconnexion — veuillez vous reconnecter pour continuer.',
    wrongPinAttempts: 'Code incorrect. {left} tentative{plural} restante{plural}.',
    forgotPinSignOut: 'Code oublié ? Se déconnecter',
    forgotPinConfirmTitle: 'Réinitialiser votre code ?',
    forgotPinConfirmBody:
      'Pour réinitialiser votre code, vous allez vous déconnecter, puis vous reconnecter et en définir un nouveau. Vos données sont en sécurité — elles restent sur votre compte.',
    forgotPinConfirmCta: 'Se déconnecter',
    // Contact picker
    selectFromContacts: 'Choisir dans les contacts',
    searchNameOrNumber: 'Rechercher un nom ou un numéro…',
    noContactsMatch: 'Aucun contact correspondant.',
    contactsAccessOff:
      'L’accès aux contacts est désactivé. Activez-le pour cette application dans les réglages de votre téléphone pour choisir des clients dans votre carnet d’adresses.',
    // Permissions
    permissionNeededTitle: 'Autorisation requise',
    cameraAccessOff:
      'L’accès à l’appareil photo est désactivé. Activez-le pour cette application dans les réglages de votre téléphone pour prendre des photos.',
    photosAccessOff:
      'L’accès aux photos est désactivé. Activez-le pour cette application dans les réglages de votre téléphone pour choisir une photo.',
    openSettings: 'Ouvrir les réglages',
    photosOfflineTitle: 'Vous êtes hors ligne',
    photosOfflineBody:
      'Les photos nécessitent une connexion pour être envoyées. Reconnectez-vous pour les ajouter.',
    // Phone input
    phoneNumber: 'Numéro de téléphone',
    selectCountry: 'Choisir un pays',
    searchCountryOrCode: 'Rechercher un pays ou un indicatif…',
    selectCountryDialCode: 'Choisir l’indicatif du pays',
    // Offline banner
    offlineWithPending:
      'Hors ligne — {count} modification{plural} sera synchronisée à la reconnexion',
    youreOffline: 'Vous êtes hors ligne',
    syncing: 'Synchronisation de {count} modification{plural}…',
    // Calendar
    pickADayToSee: 'Choisissez un jour pour voir ses livraisons.',
    today: 'AUJOURD’HUI · ',
    event: 'événement',
    events: 'événements',
    noDeliveriesThisDay: 'Aucune livraison prévue ce jour.',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    // Date field
    pickADate: 'Choisir une date',
    // Search field
    searchPlaceholder: 'Rechercher…',
  },
} as const;
