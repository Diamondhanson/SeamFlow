// What a customer's phone says when their designer moves an order.
//
// Push text is written on the server, which does not run the app's t(), so this
// is a small parallel dictionary — the same arrangement as the order reminders
// (notifications/reminder-templates.ts). The wording is deliberately the same as
// the app's own inbox entries (cnotifications.type_order_*), so the banner and
// the row it leaves behind read alike.
//
// `{order}` is the only placeholder.

import type { DeviceLanguage } from '@seamflow/schemas';

export type ClientStatusKind = 'ready_for_fitting' | 'delivered';

const COPY: Record<DeviceLanguage, Record<ClientStatusKind, string>> = {
  en: {
    ready_for_fitting: '“{order}” is ready for fitting',
    delivered: '“{order}” has been delivered',
  },
  fr: {
    ready_for_fitting: '« {order} » est prêt pour l’essayage',
    delivered: '« {order} » a été livré',
  },
  pt: {
    ready_for_fitting: '“{order}” está pronta para prova',
    delivered: '“{order}” foi entregue',
  },
  es: {
    ready_for_fitting: '“{order}” está lista para la prueba',
    delivered: '“{order}” fue entregada',
  },
  sw: {
    ready_for_fitting: '“{order}” iko tayari kupimwa',
    delivered: '“{order}” imekabidhiwa',
  },
  ar: {
    ready_for_fitting: '«{order}» جاهز للقياس',
    delivered: 'تم تسليم «{order}»',
  },
};

/** The push body, in the customer's language; English when nobody has said. */
export function clientStatusBody(
  kind: ClientStatusKind,
  order: string,
  language: DeviceLanguage | undefined,
): string {
  const lang = language && COPY[language] ? language : 'en';
  return COPY[lang][kind].replace('{order}', order);
}
