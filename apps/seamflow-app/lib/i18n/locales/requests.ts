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
  es: {
    boardTitle: 'Solicitudes',
    tileSubtitle: 'Clientes que buscan trabajo',
    guideTitle: 'Clientes que buscan trabajo',
    guideBody:
      'Las personas publican lo que quieren mandar a hacer y cualquier sastre cercano puede responder. No necesita un portafolio para ganar una — basta con una buena respuesta.',

    filterAll: 'Todo',
    empty: 'Aún no hay solicitudes abiertas cerca de usted. Aparecerán aquí cuando los clientes las publiquen.',
    emptyFiltered: 'Nada abierto para esa prenda por ahora. Pruebe con “Todo”.',

    noSpecialtiesTitle: 'Díganos qué confecciona',
    noSpecialtiesBody:
      'Seguirá viendo todo lo cercano, pero el trabajo que usted realmente hace aparecerá primero.',

    budgetLine: 'Presupuesto: {currency} {min} – {max}',
    budgetOpen: 'Sin presupuesto indicado — abierto a conversarlo',
    deadlineLine: 'Se necesita para el {date}',
    offersAndDays: '{offers} ofertas · quedan {days} días',
    enoughOffers: 'Ya tiene suficientes ofertas — no acepta más',

    detailTitle: 'Solicitud',
    gone: 'Esta solicitud ya no está disponible.',

    makeOfferHeading: 'Su oferta',
    makeOfferHint:
      'Diga cómo la confeccionaría y qué necesitaría. El precio es opcional — también puede conversarlo.',
    messageLabel: 'Mensaje',
    messagePlaceholder: 'Hago estas prendas seguido. Para el bordado yo…',
    priceLabel: 'Precio',
    priceMaxLabel: 'Hasta (opcional)',
    pricePlaceholder: '0',
    priceOptional: 'Deje ambos vacíos para responder “abierto a conversarlo”.',
    sendOffer: 'Enviar oferta',
    offerSentTitle: 'Oferta enviada',
    offerSentBody: 'El cliente la verá junto con su trabajo. Le responderán de una u otra forma.',

    alreadyOfferedTitle: 'Usted ya respondió a esta',
    enoughOffersTitle: 'Ya tiene suficientes ofertas',
    enoughOffersBody:
      'Esta solicitud ya recibió todas las ofertas que admite. Su tiempo rinde más en otra.',

    myOffersTitle: 'Mis ofertas',
    noOffersYet: 'Todavía no ha respondido a ninguna solicitud.',
    browseBoard: 'Vea lo que piden los clientes',
    offerStatus: 'Estado: {status}',
    offerPrice: '{currency} {price}',
    offerRange: '{currency} {min} – {max}',
    offerToDiscuss: 'Abierto a conversarlo',
    openChat: 'Abrir la conversación',
    withdraw: 'Retirar',
    withdrawTitle: '¿Retirar esta oferta?',
    withdrawBody: 'El cliente dejará de verla. Puede responder de nuevo más tarde si sigue abierta.',
  },
  sw: {
    boardTitle: 'Maombi',
    tileSubtitle: 'Wateja wanaotafuta kazi',
    guideTitle: 'Wateja wanaotafuta kazi',
    guideBody:
      'Watu huweka kile wanachotaka kishonwe na mshonaji yeyote aliye karibu anaweza kujibu. Huhitaji kuwa na jalada la kazi ili kupata moja — jibu zuri linatosha.',

    filterAll: 'Yote',
    empty: 'Bado hakuna maombi wazi karibu nawe. Yataonekana hapa wateja wanapoyaweka.',
    emptyFiltered: 'Hakuna lililo wazi kwa nguo hiyo kwa sasa. Jaribu “Yote”.',

    noSpecialtiesTitle: 'Tuambie unachoshona',
    noSpecialtiesBody:
      'Bado utaona kila kitu kilicho karibu, lakini kazi unayoifanya kweli itatangulia.',

    budgetLine: 'Bajeti: {currency} {min} – {max}',
    budgetOpen: 'Hakuna bajeti iliyotolewa — tayari kujadiliana',
    deadlineLine: 'Inahitajika ifikapo {date}',
    offersAndDays: 'Ofa {offers} · zimebaki siku {days}',
    enoughOffers: 'Ofa zimetosha — hazipokelewi tena',

    detailTitle: 'Ombi',
    gone: 'Ombi hili halipatikani tena.',

    makeOfferHeading: 'Ofa yako',
    makeOfferHint:
      'Eleza jinsi ungeishona na kile ungehitaji. Bei si lazima — mnaweza kujadiliana badala yake.',
    messageLabel: 'Ujumbe',
    messagePlaceholder: 'Hizi nazishona mara kwa mara. Kwa upambaji ningefanya…',
    priceLabel: 'Bei',
    priceMaxLabel: 'Hadi (si lazima)',
    pricePlaceholder: '0',
    priceOptional: 'Acha zote wazi ili kujibu “tayari kujadiliana”.',
    sendOffer: 'Tuma ofa',
    offerSentTitle: 'Ofa imetumwa',
    offerSentBody: 'Mteja ataiona pamoja na kazi yako. Utapata jibu vyovyote itakavyokuwa.',

    alreadyOfferedTitle: 'Umeshalijibu hili',
    enoughOffersTitle: 'Ofa zimeshatosha',
    enoughOffersBody:
      'Ombi hili limepata ofa zote linazoweza kupokea. Muda wako utafaa zaidi kwenye lingine.',

    myOffersTitle: 'Ofa zangu',
    noOffersYet: 'Bado hujajibu ombi lolote.',
    browseBoard: 'Ona wateja wanachoomba',
    offerStatus: 'Hali: {status}',
    offerPrice: '{currency} {price}',
    offerRange: '{currency} {min} – {max}',
    offerToDiscuss: 'Tayari kujadiliana',
    openChat: 'Fungua mazungumzo',
    withdraw: 'Ondoa',
    withdrawTitle: 'Uondoe ofa hii?',
    withdrawBody: 'Mteja hataiona tena. Unaweza kujibu tena baadaye kama bado liko wazi.',
  },
};
