// "What do you make?" — the tailor's specialties picker.
//
// The garment names themselves are NOT here: they live in the shared taxonomy
// (packages/schemas/src/garment.ts) with their own EN/FR labels, because the
// same list has to read identically in the client app, in matching, and in the
// API. Only this screen's chrome is translated here.
export const specialties = {
  en: {
    title: 'What do you make?',
    intro:
      'Pick the garments you actually sew. This is how clients looking for your kind of work find you — and how we know which requests to show you.',
    count: '{count} of {max} chosen',
    atCap: 'That’s {max} — the most you can pick. Untick one to swap it.',

    // The getting-started checklist entry, and the nudge for tailors who
    // signed up before this existed.
    checklistLabel: 'Tell us what you make',
    promptTitle: 'What do you make?',
    promptBody:
      'Pick the garments you sew so clients looking for your kind of work can find you. It takes a few taps.',
    promptGo: 'Choose now',
    promptLater: 'Later',

    // Storefront summary, where the free-text box used to be.
    storefrontLabel: 'What you make',
    storefrontEmpty: 'Not set yet — tap to choose',
    storefrontCount: '{count} chosen',
  },
  fr: {
    title: 'Que confectionnez-vous ?',
    intro:
      'Choisissez les vêtements que vous cousez réellement. C’est ainsi que les clients qui cherchent votre type de travail vous trouvent, et que nous savons quelles demandes vous montrer.',
    count: '{count} sur {max} sélectionnés',
    atCap: 'Vous avez atteint {max}, le maximum. Décochez-en un pour changer.',

    checklistLabel: 'Dites-nous ce que vous confectionnez',
    promptTitle: 'Que confectionnez-vous ?',
    promptBody:
      'Choisissez les vêtements que vous cousez pour que les clients qui cherchent votre type de travail vous trouvent. Quelques appuis suffisent.',
    promptGo: 'Choisir maintenant',
    promptLater: 'Plus tard',

    storefrontLabel: 'Ce que vous confectionnez',
    storefrontEmpty: 'Non défini — appuyez pour choisir',
    storefrontCount: '{count} sélectionnés',
  },
};
