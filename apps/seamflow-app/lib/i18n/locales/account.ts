export const account = {
  en: {
    // ── The delete screen ────────────────────────────────────────────────
    deleteTitle: 'Delete my account',
    warningBody:
      'This closes your shop and erases your records. Nothing happens for {days} days — you can change your mind at any point before then.',

    whatGoesTitle: 'What gets erased',
    goesClients: 'Every client, with their measurements',
    goesOrders: 'Every order, group order and invoice',
    goesPhotos: 'Every photo you have uploaded',
    goesFeed: 'Your public page and everything on it',
    goesAccount: 'Your sign-in — you will not be able to log back in',

    takeItTitle: 'Take your records first',
    takeItBody:
      'Save a copy of everything before it goes. Once the {days} days pass, we cannot get it back for you.',
    exportAction: 'Download my data',
    exportTitle: 'Your SeamFlow data',
    exportSavedTitle: 'Saved',
    exportSavedBody: 'Your data file has been saved to this device.',

    confirmItTitle: 'Confirm it is you',
    passwordLabel: 'Your password',
    passwordPlaceholder: 'Enter your password',
    reauthProviderBody:
      'You will be asked to sign in again to confirm this is you.',
    typeNameLabel: 'Type “{name}” to confirm',
    deleteAction: 'Delete my account',
    needed: 'Enter your password and type your business name to continue.',
    neededName: 'Type your business name exactly to continue.',

    confirmTitle: 'Delete this account?',
    confirmBody:
      '“{name}” and all of its records will be erased in 30 days. You can cancel before then.',
    confirmAction: 'Yes, delete it',

    scheduledTitle: 'Your account will close',
    scheduledBody:
      'We will erase everything in {days} days. Until then you can sign in and tap “Keep my account” to stop it.',

    // ── The pending banner ───────────────────────────────────────────────
    pendingTitle: 'Your account closes in {days} days',
    pendingTitleToday: 'Your account closes today',
    pendingBody:
      'Your shop is hidden and your records are still here. Tap below to stop this and carry on as normal.',
    keepAccount: 'Keep my account',
    keptTitle: 'Welcome back',
    keptBody: 'Your account is safe and your shop is visible again.',
  },
  fr: {
    deleteTitle: 'Supprimer mon compte',
    warningBody:
      'Cela ferme votre atelier et efface vos dossiers. Rien ne se passe pendant {days} jours — vous pouvez changer d’avis avant.',

    whatGoesTitle: 'Ce qui sera effacé',
    goesClients: 'Tous vos clients, avec leurs mesures',
    goesOrders: 'Toutes les commandes, commandes de groupe et factures',
    goesPhotos: 'Toutes les photos que vous avez ajoutées',
    goesFeed: 'Votre page publique et tout son contenu',
    goesAccount: 'Votre connexion — vous ne pourrez plus vous reconnecter',

    takeItTitle: 'Récupérez vos dossiers d’abord',
    takeItBody:
      'Enregistrez une copie de tout avant la suppression. Passé les {days} jours, nous ne pourrons rien récupérer.',
    exportAction: 'Télécharger mes données',
    exportTitle: 'Vos données SeamFlow',
    exportSavedTitle: 'Enregistré',
    exportSavedBody: 'Votre fichier de données a été enregistré sur cet appareil.',

    confirmItTitle: 'Confirmez que c’est bien vous',
    passwordLabel: 'Votre mot de passe',
    passwordPlaceholder: 'Saisissez votre mot de passe',
    reauthProviderBody:
      'Il vous sera demandé de vous reconnecter pour confirmer que c’est bien vous.',
    typeNameLabel: 'Saisissez « {name} » pour confirmer',
    deleteAction: 'Supprimer mon compte',
    needed:
      'Saisissez votre mot de passe et le nom de votre atelier pour continuer.',
    neededName: 'Saisissez exactement le nom de votre atelier pour continuer.',

    confirmTitle: 'Supprimer ce compte ?',
    confirmBody:
      '« {name} » et tous ses dossiers seront effacés dans 30 jours. Vous pouvez annuler avant.',
    confirmAction: 'Oui, supprimer',

    scheduledTitle: 'Votre compte sera fermé',
    scheduledBody:
      'Nous effacerons tout dans {days} jours. D’ici là, connectez-vous et touchez « Garder mon compte » pour annuler.',

    pendingTitle: 'Votre compte sera fermé dans {days} jours',
    pendingTitleToday: 'Votre compte sera fermé aujourd’hui',
    pendingBody:
      'Votre atelier est masqué et vos dossiers sont toujours là. Touchez ci-dessous pour annuler et continuer normalement.',
    keepAccount: 'Garder mon compte',
    keptTitle: 'Bon retour',
    keptBody: 'Votre compte est conservé et votre atelier est de nouveau visible.',
  },
} as const;
