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
};
