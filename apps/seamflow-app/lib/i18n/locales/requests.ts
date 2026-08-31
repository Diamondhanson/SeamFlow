// Requests — "Can you make this?" (ROADMAP appendix H), the tailor's side.
//
// Garment names are NOT here: they come from the shared taxonomy so the client
// app, matching and this screen all say the same word.
export const requests = {
  en: {
    boardTitle: 'Requests',
    tileSubtitle: 'Clients asking for work',
    guideTitle: 'Clients asking for work',
    guideBody:
      'People post what they want made and any tailor nearby can answer. You do not need a portfolio to win one — a good reply is enough.',

    filterAll: 'Everything',
    empty: 'No open requests near you yet. They will show up here as clients post them.',
    emptyFiltered: 'Nothing open for that garment right now. Try “Everything”.',

    noSpecialtiesTitle: 'Tell us what you make',
    noSpecialtiesBody:
      'You will still see everything nearby, but the work you actually do will come first.',

    budgetLine: 'Budget: {currency} {min} – {max}',
    budgetOpen: 'No budget given — open to discuss',
    deadlineLine: 'Needed by {date}',
    offersAndDays: '{offers} offers · {days} days left',
    enoughOffers: 'Enough offers — no longer accepting',

    detailTitle: 'Request',
    gone: 'This request is no longer available.',

    makeOfferHeading: 'Your offer',
    makeOfferHint:
      'Say how you would make it and what you would need. A price is optional — you can talk it through instead.',
    messageLabel: 'Message',
    messagePlaceholder: 'I make these often. For the embroidery I would…',
    priceLabel: 'Price',
    priceMaxLabel: 'Up to (optional)',
    pricePlaceholder: '0',
    priceOptional: 'Leave both empty to answer “open to discuss”.',
    sendOffer: 'Send offer',
    offerSentTitle: 'Offer sent',
    offerSentBody: 'The client will see it with your work. You will hear back either way.',

    alreadyOfferedTitle: 'You have answered this',
    enoughOffersTitle: 'Enough offers already',
    enoughOffersBody:
      'This request has all the offers it can take. Your time is better spent on another.',

    myOffersTitle: 'My offers',
    noOffersYet: 'You have not answered any requests yet.',
    browseBoard: 'See what clients are asking for',
    offerStatus: 'Status: {status}',
    offerPrice: '{currency} {price}',
    offerRange: '{currency} {min} – {max}',
    offerToDiscuss: 'Open to discuss',
    openChat: 'Open the conversation',
    withdraw: 'Withdraw',
    withdrawTitle: 'Withdraw this offer?',
    withdrawBody: 'The client will no longer see it. You can answer again later if it is still open.',
  },
  fr: {
    boardTitle: 'Demandes',
    tileSubtitle: 'Des clients cherchent un tailleur',
    guideTitle: 'Des clients cherchent un tailleur',
    guideBody:
      'Les clients publient ce qu’ils veulent faire coudre et tout tailleur à proximité peut répondre. Pas besoin de portfolio : une bonne réponse suffit.',

    filterAll: 'Tout',
    empty: 'Aucune demande ouverte près de chez vous. Elles apparaîtront ici.',
    emptyFiltered: 'Rien d’ouvert pour ce vêtement. Essayez « Tout ».',

    noSpecialtiesTitle: 'Dites-nous ce que vous confectionnez',
    noSpecialtiesBody:
      'Vous verrez toujours tout ce qui est proche, mais votre travail habituel apparaîtra en premier.',

    budgetLine: 'Budget : {currency} {min} – {max}',
    budgetOpen: 'Aucun budget indiqué — à discuter',
    deadlineLine: 'Pour le {date}',
    offersAndDays: '{offers} offres · {days} jours restants',
    enoughOffers: 'Assez d’offres — clôturé',

    detailTitle: 'Demande',
    gone: 'Cette demande n’est plus disponible.',

    makeOfferHeading: 'Votre offre',
    makeOfferHint:
      'Expliquez comment vous la réaliseriez et ce dont vous auriez besoin. Le prix est facultatif.',
    messageLabel: 'Message',
    messagePlaceholder: 'J’en confectionne souvent. Pour la broderie, je…',
    priceLabel: 'Prix',
    priceMaxLabel: 'Jusqu’à (facultatif)',
    pricePlaceholder: '0',
    priceOptional: 'Laissez les deux vides pour répondre « à discuter ».',
    sendOffer: 'Envoyer l’offre',
    offerSentTitle: 'Offre envoyée',
    offerSentBody: 'Le client la verra avec votre travail. Vous aurez une réponse dans tous les cas.',

    alreadyOfferedTitle: 'Vous avez déjà répondu',
    enoughOffersTitle: 'Déjà assez d’offres',
    enoughOffersBody:
      'Cette demande a reçu toutes les offres possibles. Votre temps sera mieux investi ailleurs.',

    myOffersTitle: 'Mes offres',
    noOffersYet: 'Vous n’avez encore répondu à aucune demande.',
    browseBoard: 'Voir ce que les clients demandent',
    offerStatus: 'Statut : {status}',
    offerPrice: '{currency} {price}',
    offerRange: '{currency} {min} – {max}',
    offerToDiscuss: 'À discuter',
    openChat: 'Ouvrir la conversation',
    withdraw: 'Retirer',
    withdrawTitle: 'Retirer cette offre ?',
    withdrawBody: 'Le client ne la verra plus. Vous pourrez répondre à nouveau si elle est encore ouverte.',
  },
  pt: {
    boardTitle: 'Pedidos',
    tileSubtitle: 'Clientes à procura de trabalho',
    guideTitle: 'Clientes à procura de trabalho',
    guideBody:
      'As pessoas publicam o que querem que lhes façam e qualquer alfaiate por perto pode responder. Não precisa de portefólio para ganhar um — uma boa resposta chega.',

    filterAll: 'Tudo',
    empty:
      'Ainda não há pedidos abertos perto de si. Vão aparecer aqui à medida que os clientes os publicam.',
    emptyFiltered: 'Nada aberto para essa peça de momento. Experimente “Tudo”.',

    noSpecialtiesTitle: 'Diga-nos o que confeciona',
    noSpecialtiesBody:
      'Continuará a ver tudo o que está perto, mas o trabalho que realmente faz aparece primeiro.',

    budgetLine: 'Orçamento: {currency} {min} – {max}',
    budgetOpen: 'Sem orçamento indicado — aberto a conversa',
    deadlineLine: 'Necessário até {date}',
    offersAndDays: '{offers} propostas · faltam {days} dias',
    enoughOffers: 'Propostas suficientes — já não aceita mais',

    detailTitle: 'Pedido',
    gone: 'Este pedido já não está disponível.',

    makeOfferHeading: 'A sua proposta',
    makeOfferHint:
      'Diga como o faria e do que precisaria. O preço é opcional — pode falar sobre isso depois.',
    messageLabel: 'Mensagem',
    messagePlaceholder: 'Faço destes com frequência. Para o bordado eu…',
    priceLabel: 'Preço',
    priceMaxLabel: 'Até (opcional)',
    pricePlaceholder: '0',
    priceOptional: 'Deixe ambos vazios para responder “aberto a conversa”.',
    sendOffer: 'Enviar proposta',
    offerSentTitle: 'Proposta enviada',
    offerSentBody:
      'O cliente vai vê-la juntamente com o seu trabalho. Terá resposta de qualquer forma.',

    alreadyOfferedTitle: 'Já respondeu a este',
    enoughOffersTitle: 'Já tem propostas suficientes',
    enoughOffersBody:
      'Este pedido já tem todas as propostas que aceita. O seu tempo rende mais noutro.',

    myOffersTitle: 'As minhas propostas',
    noOffersYet: 'Ainda não respondeu a nenhum pedido.',
    browseBoard: 'Ver o que os clientes estão a pedir',
    offerStatus: 'Estado: {status}',
    offerPrice: '{currency} {price}',
    offerRange: '{currency} {min} – {max}',
    offerToDiscuss: 'Aberto a conversa',
    openChat: 'Abrir a conversa',
    withdraw: 'Retirar',
    withdrawTitle: 'Retirar esta proposta?',
    withdrawBody:
      'O cliente deixará de a ver. Pode responder novamente mais tarde se ainda estiver aberto.',
  },
};
