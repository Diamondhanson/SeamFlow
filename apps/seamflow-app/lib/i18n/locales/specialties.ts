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
  pt: {
    title: 'O que confeciona?',
    intro:
      'Escolha as peças que realmente costura. É assim que os clientes à procura do seu tipo de trabalho o encontram — e como sabemos que pedidos lhe mostrar.',
    count: '{count} de {max} escolhidas',
    atCap: 'São {max} — o máximo que pode escolher. Desmarque uma para trocar.',

    checklistLabel: 'Diga-nos o que confeciona',
    promptTitle: 'O que confeciona?',
    promptBody:
      'Escolha as peças que costura para que os clientes à procura do seu tipo de trabalho o encontrem. São poucos toques.',
    promptGo: 'Escolher agora',
    promptLater: 'Mais tarde',

    storefrontLabel: 'O que confeciona',
    storefrontEmpty: 'Ainda por definir — toque para escolher',
    storefrontCount: '{count} escolhidas',
  },
  es: {
    title: '¿Qué confecciona?',
    intro:
      'Elija las prendas que realmente cose. Así lo encuentran los clientes que buscan su tipo de trabajo, y así sabemos qué solicitudes mostrarle.',
    count: '{count} de {max} elegidas',
    atCap: 'Son {max}, el máximo que puede elegir. Desmarque una para cambiarla.',

    checklistLabel: 'Cuéntenos qué confecciona',
    promptTitle: '¿Qué confecciona?',
    promptBody:
      'Elija las prendas que cose para que los clientes que buscan su tipo de trabajo lo encuentren. Son unos pocos toques.',
    promptGo: 'Elegir ahora',
    promptLater: 'Más tarde',

    storefrontLabel: 'Lo que confecciona',
    storefrontEmpty: 'Sin definir todavía: toque para elegir',
    storefrontCount: '{count} elegidas',
  },
  sw: {
    title: 'Unashona nini?',
    intro:
      'Chagua nguo unazoshona kweli. Ndivyo wateja wanaotafuta kazi ya aina yako wanavyokupata, na ndivyo tunavyojua maombi ya kukuonyesha.',
    count: '{count} kati ya {max} zimechaguliwa',
    atCap: 'Ni {max} — kiwango cha juu unachoweza kuchagua. Ondoa moja ili kubadilisha.',

    checklistLabel: 'Tuambie unashona nini',
    promptTitle: 'Unashona nini?',
    promptBody:
      'Chagua nguo unazoshona ili wateja wanaotafuta kazi ya aina yako wakupate. Ni mibonyezo michache tu.',
    promptGo: 'Chagua sasa',
    promptLater: 'Baadaye',

    storefrontLabel: 'Unachoshona',
    storefrontEmpty: 'Bado haijawekwa — gusa ili kuchagua',
    storefrontCount: '{count} zimechaguliwa',
  },
};
