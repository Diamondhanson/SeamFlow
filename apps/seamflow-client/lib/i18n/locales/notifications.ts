// ============================================================================
// Notification inbox.
//
// The `type_*` keys mirror the NotificationType union in @seamflow/schemas
// one-for-one, and are looked up at render as t('notifications.type_' + type).
// The API sends `type` + `params` and never rendered text — that is what keeps
// a notification in the READER's language and correct after the thing it
// describes is renamed.
//
// Keep this file identical in seamflow-client. A notification written by one
// app is read in the other.
// ============================================================================

export const notifications = {
  en: {
    title: 'Notifications',
    empty: 'Nothing yet',
    emptyBody: "Updates about your orders and messages will show up here.",
    markAllRead: 'Mark all read',
    unreadOne: '1 unread',
    unreadMany: '{count} unread',
    justNow: 'Just now',
    loadFailed: "We couldn't load your notifications. Check your connection and try again.",
    inboxSection: 'In your inbox',
    inboxSectionHint:
      'What gets recorded here. Turning one off stops both the notification and the inbox entry.',
    type_enquiry_received_label: 'New enquiries',

    // ── to the client ──────────────────────────────────────────────────────
    type_quote_received: '{tailorName} sent you a quote for “{orderName}”',
    type_invoice_issued: 'Invoice ready for “{orderName}”',
    type_payment_confirmed: 'Payment received for “{orderName}” — thank you',
    type_order_ready_for_fitting: '“{orderName}” is ready for fitting',
    type_order_ready_for_pickup: '“{orderName}” is ready for pickup',
    type_order_delivered: '“{orderName}” has been delivered',
    type_order_delivery_date_moved: 'New date for “{orderName}”: {date}',
    type_order_cancelled_by_tailor: '{tailorName} cancelled “{orderName}”',

    // ── to the tailor ──────────────────────────────────────────────────────
    type_enquiry_received: 'New enquiry from {clientName}',
    type_quote_accepted: '{clientName} accepted your quote for “{orderName}”',
    type_quote_declined: '{clientName} declined your quote for “{orderName}”',
    type_payment_received: '{clientName} paid for “{orderName}”',
    type_order_claimed: '{clientName} claimed “{orderName}”',

    // ── either side ────────────────────────────────────────────────────────
    type_security_new_device: 'New sign-in on a new device',
    type_security_phone_verified: 'Your phone number is verified',
    type_moderation_outcome: 'We reviewed your report',
  },
  fr: {
    title: 'Notifications',
    empty: 'Rien pour le moment',
    emptyBody:
      'Les mises à jour de vos commandes et messages apparaîtront ici.',
    markAllRead: 'Tout marquer comme lu',
    unreadOne: '1 non lue',
    unreadMany: '{count} non lues',
    justNow: "À l'instant",
    loadFailed:
      'Impossible de charger vos notifications. Vérifiez votre connexion et réessayez.',
    inboxSection: 'Dans votre boîte',
    inboxSectionHint:
      'Ce qui est enregistré ici. En désactiver un arrête à la fois la notification et l’entrée.',
    type_enquiry_received_label: 'Nouvelles demandes',

    type_quote_received: '{tailorName} vous a envoyé un devis pour « {orderName} »',
    type_invoice_issued: 'Facture prête pour « {orderName} »',
    type_payment_confirmed: 'Paiement reçu pour « {orderName} » — merci',
    type_order_ready_for_fitting: '« {orderName} » est prêt pour l’essayage',
    type_order_ready_for_pickup: '« {orderName} » est prêt à être retiré',
    type_order_delivered: '« {orderName} » a été livré',
    type_order_delivery_date_moved:
      'Nouvelle date pour « {orderName} » : {date}',
    type_order_cancelled_by_tailor: '{tailorName} a annulé « {orderName} »',

    type_enquiry_received: 'Nouvelle demande de {clientName}',
    type_quote_accepted: '{clientName} a accepté votre devis pour « {orderName} »',
    type_quote_declined: '{clientName} a refusé votre devis pour « {orderName} »',
    type_payment_received: '{clientName} a payé « {orderName} »',
    type_order_claimed: '{clientName} a récupéré « {orderName} »',

    type_security_new_device: 'Nouvelle connexion sur un nouvel appareil',
    type_security_phone_verified: 'Votre numéro de téléphone est vérifié',
    type_moderation_outcome: 'Nous avons examiné votre signalement',
  },
  pt: {
    title: 'Notificações',
    empty: 'Ainda nada',
    emptyBody: 'As novidades sobre as suas encomendas e mensagens aparecem aqui.',
    markAllRead: 'Marcar tudo como lido',
    unreadOne: '1 por ler',
    unreadMany: '{count} por ler',
    justNow: 'Agora mesmo',
    loadFailed:
      'Não foi possível carregar as suas notificações. Verifique a ligação e tente novamente.',
    inboxSection: 'Na sua caixa de entrada',
    inboxSectionHint:
      'O que fica registado aqui. Desligar um item impede a notificação e o registo na caixa de entrada.',
    type_enquiry_received_label: 'Novos pedidos de informação',

    // ── para o cliente ─────────────────────────────────────────────────────
    type_quote_received: '{tailorName} enviou-lhe um orçamento para “{orderName}”',
    type_invoice_issued: 'Fatura pronta para “{orderName}”',
    type_payment_confirmed: 'Pagamento recebido para “{orderName}” — obrigado',
    type_order_ready_for_fitting: '“{orderName}” está pronta para prova',
    type_order_ready_for_pickup: '“{orderName}” está pronta para levantar',
    type_order_delivered: '“{orderName}” foi entregue',
    type_order_delivery_date_moved: 'Nova data para “{orderName}”: {date}',
    type_order_cancelled_by_tailor: '{tailorName} cancelou “{orderName}”',

    // ── para o alfaiate ────────────────────────────────────────────────────
    type_enquiry_received: 'Novo pedido de informação de {clientName}',
    type_quote_accepted: '{clientName} aceitou o seu orçamento para “{orderName}”',
    type_quote_declined: '{clientName} recusou o seu orçamento para “{orderName}”',
    type_payment_received: '{clientName} pagou “{orderName}”',
    type_order_claimed: '{clientName} reclamou “{orderName}”',

    // ── de ambos os lados ──────────────────────────────────────────────────
    type_security_new_device: 'Novo início de sessão num dispositivo novo',
    type_security_phone_verified: 'O seu número de telemóvel está verificado',
    type_moderation_outcome: 'Analisámos a sua denúncia',
  },
  es: {
    title: 'Notificaciones',
    empty: 'Nada todavía',
    emptyBody: 'Las novedades sobre sus pedidos y mensajes aparecerán aquí.',
    markAllRead: 'Marcar todo como leído',
    unreadOne: '1 sin leer',
    unreadMany: '{count} sin leer',
    justNow: 'Ahora mismo',
    loadFailed:
      'No pudimos cargar sus notificaciones. Revise su conexión e intente de nuevo.',
    inboxSection: 'En su bandeja',
    inboxSectionHint:
      'Lo que queda registrado aquí. Desactivar uno detiene la notificación y el registro en la bandeja.',
    type_enquiry_received_label: 'Nuevas consultas',

    // ── al cliente ─────────────────────────────────────────────────────────
    type_quote_received: '{tailorName} le envió una cotización por “{orderName}”',
    type_invoice_issued: 'Factura lista para “{orderName}”',
    type_payment_confirmed: 'Pago recibido por “{orderName}” — gracias',
    type_order_ready_for_fitting: '“{orderName}” está lista para la prueba',
    type_order_ready_for_pickup: '“{orderName}” está lista para recoger',
    type_order_delivered: '“{orderName}” fue entregada',
    type_order_delivery_date_moved: 'Nueva fecha para “{orderName}”: {date}',
    type_order_cancelled_by_tailor: '{tailorName} canceló “{orderName}”',

    // ── al sastre ──────────────────────────────────────────────────────────
    type_enquiry_received: 'Nueva consulta de {clientName}',
    type_quote_accepted: '{clientName} aceptó su cotización por “{orderName}”',
    type_quote_declined: '{clientName} rechazó su cotización por “{orderName}”',
    type_payment_received: '{clientName} pagó “{orderName}”',
    type_order_claimed: '{clientName} reclamó “{orderName}”',

    // ── ambos lados ────────────────────────────────────────────────────────
    type_security_new_device: 'Nuevo inicio de sesión en un dispositivo nuevo',
    type_security_phone_verified: 'Su número de teléfono está verificado',
    type_moderation_outcome: 'Revisamos su reporte',
  },
  sw: {
    title: 'Arifa',
    empty: 'Bado hakuna kitu',
    emptyBody: 'Habari kuhusu maagizo na ujumbe wako zitaonekana hapa.',
    markAllRead: 'Weka zote kuwa zimesomwa',
    unreadOne: '1 haijasomwa',
    unreadMany: '{count} hazijasomwa',
    justNow: 'Sasa hivi',
    loadFailed:
      'Hatukuweza kupakia arifa zako. Angalia muunganisho wako kisha ujaribu tena.',
    inboxSection: 'Kwenye kikasha chako',
    inboxSectionHint:
      'Kinachohifadhiwa hapa. Kuzima kimoja kunazuia arifa na pia kumbukumbu ya kikasha.',
    type_enquiry_received_label: 'Maswali mapya',

    // ── kwa mteja ──────────────────────────────────────────────────────────
    type_quote_received: '{tailorName} amekutumia bei ya “{orderName}”',
    type_invoice_issued: 'Ankara iko tayari kwa “{orderName}”',
    type_payment_confirmed: 'Malipo yamepokelewa kwa “{orderName}” — asante',
    type_order_ready_for_fitting: '“{orderName}” iko tayari kupimwa',
    type_order_ready_for_pickup: '“{orderName}” iko tayari kuchukuliwa',
    type_order_delivered: '“{orderName}” imekabidhiwa',
    type_order_delivery_date_moved: 'Tarehe mpya ya “{orderName}”: {date}',
    type_order_cancelled_by_tailor: '{tailorName} ameghairi “{orderName}”',

    // ── kwa mshonaji ───────────────────────────────────────────────────────
    type_enquiry_received: 'Swali jipya kutoka kwa {clientName}',
    type_quote_accepted: '{clientName} amekubali bei yako ya “{orderName}”',
    type_quote_declined: '{clientName} amekataa bei yako ya “{orderName}”',
    type_payment_received: '{clientName} amelipa “{orderName}”',
    type_order_claimed: '{clientName} amedai “{orderName}”',

    // ── pande zote mbili ───────────────────────────────────────────────────
    type_security_new_device: 'Kuingia kwa mara ya kwanza kwenye kifaa kipya',
    type_security_phone_verified: 'Namba yako ya simu imethibitishwa',
    type_moderation_outcome: 'Tumepitia ripoti yako',
  },
};
