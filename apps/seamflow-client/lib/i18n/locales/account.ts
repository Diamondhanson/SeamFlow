export const account = {
  en: {
    deleteTitle: 'Delete my account',
    warningBody:
      'This erases your SeamFlow account. Nothing happens for {days} days — you can change your mind at any point before then.',

    whatGoesTitle: 'What gets erased',
    goesRequests: 'Your requests and the offers tailors sent you',
    goesMessages: 'Your messages with tailors',
    goesMeasurements: 'Your saved measurements',
    goesAccount: 'Your sign-in — you will not be able to log back in',

    takeItTitle: 'Take a copy first',
    takeItBody:
      'Save a copy of everything before it goes. Once the {days} days pass, we cannot get it back for you.',
    exportAction: 'Download my data',
    exportTitle: 'Your SeamFlow data',
    exportSavedTitle: 'Saved',
    exportSavedBody: 'Your data file has been saved to this device.',

    confirmItTitle: 'Confirm it is you',
    passwordLabel: 'Your password',
    passwordPlaceholder: 'Enter your password',
    reauthUnavailable:
      'Deleting an account you signed into with Google or Apple is not available in this app yet. Please contact support.',
    typeEmailLabel: 'Type your email address to confirm',
    deleteAction: 'Delete my account',
    needed: 'Enter your password and type your email address to continue.',

    confirmTitle: 'Delete this account?',
    confirmBody:
      'Your account and everything on it will be erased in 30 days. You can cancel before then.',
    confirmAction: 'Yes, delete it',

    scheduledTitle: 'Your account will close',
    scheduledBody:
      'We will erase everything in {days} days. Until then you can sign in and tap “Keep my account” to stop it.',

    pendingTitle: 'Your account closes in {days} days',
    pendingTitleToday: 'Your account closes today',
    pendingBody:
      'Nothing has been erased yet. Tap below to stop this and carry on as normal.',
    keepAccount: 'Keep my account',
    keptTitle: 'Welcome back',
    keptBody: 'Your account is safe.',

    deleteAccountRow: 'Delete my account',
  },
  fr: {
    deleteTitle: 'Supprimer mon compte',
    warningBody:
      'Cela efface votre compte SeamFlow. Rien ne se passe pendant {days} jours — vous pouvez changer d’avis avant.',

    whatGoesTitle: 'Ce qui sera effacé',
    goesRequests: 'Vos demandes et les offres reçues des couturiers',
    goesMessages: 'Vos messages avec les couturiers',
    goesMeasurements: 'Vos mesures enregistrées',
    goesAccount: 'Votre connexion — vous ne pourrez plus vous reconnecter',

    takeItTitle: 'Récupérez une copie d’abord',
    takeItBody:
      'Enregistrez une copie de tout avant la suppression. Passé les {days} jours, nous ne pourrons rien récupérer.',
    exportAction: 'Télécharger mes données',
    exportTitle: 'Vos données SeamFlow',
    exportSavedTitle: 'Enregistré',
    exportSavedBody: 'Votre fichier de données a été enregistré sur cet appareil.',

    confirmItTitle: 'Confirmez que c’est bien vous',
    passwordLabel: 'Votre mot de passe',
    passwordPlaceholder: 'Saisissez votre mot de passe',
    reauthUnavailable:
      'La suppression d’un compte connecté avec Google ou Apple n’est pas encore disponible dans cette application. Veuillez contacter le support.',
    typeEmailLabel: 'Saisissez votre adresse e-mail pour confirmer',
    deleteAction: 'Supprimer mon compte',
    needed: 'Saisissez votre mot de passe et votre adresse e-mail pour continuer.',

    confirmTitle: 'Supprimer ce compte ?',
    confirmBody:
      'Votre compte et tout son contenu seront effacés dans 30 jours. Vous pouvez annuler avant.',
    confirmAction: 'Oui, supprimer',

    scheduledTitle: 'Votre compte sera fermé',
    scheduledBody:
      'Nous effacerons tout dans {days} jours. D’ici là, connectez-vous et touchez « Garder mon compte » pour annuler.',

    pendingTitle: 'Votre compte sera fermé dans {days} jours',
    pendingTitleToday: 'Votre compte sera fermé aujourd’hui',
    pendingBody:
      'Rien n’a encore été effacé. Touchez ci-dessous pour annuler et continuer normalement.',
    keepAccount: 'Garder mon compte',
    keptTitle: 'Bon retour',
    keptBody: 'Votre compte est conservé.',

    deleteAccountRow: 'Supprimer mon compte',
  },
} as const;
