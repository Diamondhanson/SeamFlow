// ============================================================================
// useShareOrder — Phase 1.6 (+ copy-link action menu)
//
// Flow when the tailor taps "Share with client":
//   1. Mint a fresh magic-link via POST /orders/:id/share-link.
//   2. Present a centered action dialog showing the link, with adaptive
//      options:
//        • Client has an E.164 phone → "Open WhatsApp" + "Copy link"
//        • No phone on file          → "Copy link" + "Share via…"
//   3. "Open WhatsApp":
//        a. Try the `whatsapp://send?phone=…&text=…` scheme first. Only the
//           installed WhatsApp app handles it — opens the chat with that
//           contact pre-loaded. On iOS the URL needs to pass `canOpenURL`,
//           which requires `LSApplicationQueriesSchemes` to include
//           `whatsapp` (handled by expo-config, see app.json).
//        b. If WhatsApp isn't installed (`canOpenURL` false), try the
//           universal `https://wa.me/<digits>?text=…` URL.
//        c. If both fail, drop into the OS share sheet as a last resort.
//   4. "Copy link" writes the raw URL to the clipboard via expo-clipboard
//      and confirms with a dialog.
//
// We never throw out of share() — every error path surfaces a dialog and
// resolves. The mutation hook exposes `isPending` so the button can disable.
// ============================================================================

import { useCallback } from 'react';
import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  formatOrderShareMessage,
  phoneToWaMeDigits,
  type OrderShareMessageInput,
} from '@seamflow/utils';
import { useIssueShareLink } from './queries';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

export interface ShareOrderInput {
  orderName: string;
  clientName?: string | null;
  /** E.164 (e.g. +234803…). If absent or invalid we skip the WhatsApp deep link. */
  clientPhone?: string | null;
  tailorBusinessName?: string | null;
}

export function useShareOrder(orderId: string) {
  const issue = useIssueShareLink(orderId);
  const dialog = useDialog();
  const { t } = useTranslation();

  /** Copy the raw magic-link URL to the clipboard and confirm. */
  const copyLink = useCallback(
    async (url: string): Promise<void> => {
      try {
        await Clipboard.setStringAsync(url);
        await dialog.alert({
          title: t('orders.linkCopiedTitle'),
          message: t('orders.linkCopiedBody'),
          tone: 'success',
        });
      } catch (err) {
        await dialog.error(err, { title: t('orders.couldNotCopy') });
      }
    },
    [dialog, t],
  );

  /** Open the native share sheet (SMS / Mail / etc.). Never throws. */
  const runShareSheet = useCallback(
    async (message: string, url: string): Promise<void> => {
      try {
        // iOS uses `url` separately; Android collapses it into the message —
        // the shared formatter already embeds the URL in the body.
        await Share.share({ message, url });
      } catch (err) {
        await dialog.error(err, { title: t('orders.couldNotShare') });
      }
    },
    [dialog, t],
  );

  /** Try WhatsApp first; fall back to the OS share sheet if it can't open. */
  const runWhatsApp = useCallback(
    async (digits: string, message: string, url: string): Promise<void> => {
      const opened = await tryOpenWhatsApp(digits, message);
      if (!opened) await runShareSheet(message, url);
    },
    [runShareSheet],
  );

  const share = useCallback(
    async (input: ShareOrderInput): Promise<void> => {
      try {
        const link = await issue.mutateAsync();
        const message = formatMessage({ ...input, url: link.url });
        const digits = phoneToWaMeDigits(input.clientPhone);

        // Adaptive: with a phone we lead with WhatsApp; without, we offer the
        // OS share sheet as the second channel. The link is shown as the body.
        const actions = digits
          ? [
              { label: t('orders.shareWhatsApp'), value: 'whatsapp' as const },
              { label: t('orders.copyLink'), value: 'copy' as const },
            ]
          : [
              { label: t('orders.copyLink'), value: 'copy' as const },
              { label: t('orders.shareVia'), value: 'sheet' as const },
            ];

        const action = await dialog.choose<'whatsapp' | 'copy' | 'sheet'>({
          title: t('orders.shareTitle'),
          message: link.url,
          actions,
        });

        if (action === 'whatsapp' && digits) await runWhatsApp(digits, message, link.url);
        else if (action === 'copy') await copyLink(link.url);
        else if (action === 'sheet') await runShareSheet(message, link.url);
      } catch (err) {
        await dialog.error(err, { title: t('orders.couldNotShare') });
      }
    },
    [issue, dialog, t, copyLink, runWhatsApp, runShareSheet],
  );

  return { share, isPending: issue.isPending };
}

function formatMessage(input: ShareOrderInput & { url: string }): string {
  const payload: OrderShareMessageInput = {
    url: input.url,
    orderName: input.orderName,
    clientName: input.clientName,
    tailorBusinessName: input.tailorBusinessName,
  };
  return formatOrderShareMessage(payload);
}

/**
 * Try to launch WhatsApp with a pre-filled chat to the given phone digits.
 * Returns true if some URL was successfully opened.
 *
 * The order matters: the `whatsapp://` scheme is the *real* deep link —
 * it doesn't bounce through a browser tab. We use it first when WhatsApp
 * is installed. If it's not installed, falling back to `wa.me` gives the
 * user a reasonable browser-mediated handoff (and on Android it'll prompt
 * to install WhatsApp from the Play Store).
 */
async function tryOpenWhatsApp(digits: string, message: string): Promise<boolean> {
  const encoded = encodeURIComponent(message);

  // iOS canOpenURL is gated by Info.plist LSApplicationQueriesSchemes.
  // We list `whatsapp` in app.json so this check is honest on iOS.
  const native = `whatsapp://send?phone=${digits}&text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(native);
    if (can) {
      await Linking.openURL(native);
      return true;
    }
  } catch {
    // continue to wa.me fallback
  }

  const wame = `https://wa.me/${digits}?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(wame);
    if (can) {
      await Linking.openURL(wame);
      return true;
    }
  } catch {
    // fall through to share sheet
  }

  // On some Android setups canOpenURL('https://...') is false but openURL
  // would still succeed via the default browser. Blind open as a last attempt,
  // Android-only — on iOS we trust canOpenURL.
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(wame);
      return true;
    } catch {
      // give up
    }
  }

  return false;
}
