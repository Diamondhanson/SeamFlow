// ============================================================================
// Opening a notification.
//
// Tapping a row used to do one of two things: navigate, or nothing at all.
// "Nothing at all" happened more than it should — a request, an offer or a
// support reply had no route, and anything whose entity had been deleted since
// simply swallowed the tap. A row that does nothing when you press it reads as
// broken, not as "there is nothing more to see".
//
// So every tap now opens the same centered dialog: what happened, when it
// happened, and a way through to the thing itself when there still is one.
// Built on dialog.choose rather than a new dialog kind, because that is
// already a centered card with a title, a message and actions.
//
// Shared by the tailor inbox and the client hub, which route to different
// paths for the same entity. Each side passes its own router in.
// ============================================================================

import { useCallback } from 'react';
import type { Notification, NotificationEntityType } from '@seamflow/schemas';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

/** Where each side sends someone for a given entity. Null means no screen. */
export type NotificationRoutes = Partial<Record<NotificationEntityType, (id: string) => string>>;

/**
 * The word for the kind of thing this is about, used as the dialog's title.
 *
 * Deliberately six words rather than a label per notification type: 25 types
 * across six languages is 150 strings to keep in step for a heading nobody
 * reads twice. Notifications with no entity (a new device, a moderation
 * outcome, a subscription about to lapse) get a generic one.
 */
const TITLE_KEY: Record<NotificationEntityType, string> = {
  order: 'notifications.aboutOrder',
  conversation: 'notifications.aboutConversation',
  invoice: 'notifications.aboutInvoice',
  request: 'notifications.aboutRequest',
  offer: 'notifications.aboutOffer',
  support_ticket: 'notifications.aboutSupport',
};

const OPEN_KEY: Record<NotificationEntityType, string> = {
  order: 'notifications.openOrder',
  conversation: 'notifications.openConversation',
  invoice: 'notifications.openInvoice',
  request: 'notifications.openRequest',
  offer: 'notifications.openOffer',
  support_ticket: 'notifications.openSupport',
};

/** The full moment, not the list's shorthand: this is the detail view. */
function fullWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export function useNotificationDetail(routes: NotificationRoutes) {
  const dialog = useDialog();
  const { t } = useTranslation();

  return useCallback(
    async (n: Notification): Promise<string | null> => {
      // The body is rendered from type + params here, as everywhere else, so
      // it is in the reader's language and survives a rename of the thing.
      const body = t(`notifications.type_${n.type.replace(/\./g, '_')}`, n.params);
      const route = n.entityType && n.entityId ? routes[n.entityType] : undefined;
      const target = route && n.entityId ? route(n.entityId) : null;

      const chosen = await dialog.choose<'open'>({
        title: n.entityType ? t(TITLE_KEY[n.entityType]) : t('notifications.aboutGeneric'),
        message: `${body}\n\n${fullWhen(n.createdAt)}`,
        actions: target && n.entityType ? [{ label: t(OPEN_KEY[n.entityType]), value: 'open' }] : [],
        cancelLabel: t('common.close'),
      });
      return chosen === 'open' ? target : null;
    },
    [dialog, routes, t],
  );
}
