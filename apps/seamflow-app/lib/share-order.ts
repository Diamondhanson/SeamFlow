// ============================================================================
// useShareOrder — Phase 1.6
//
// Flow when the tailor taps "Share with client":
//   1. Mint a fresh magic-link via POST /orders/:id/share-link
//   2. If the client has an E.164 phone:
//        a. Try the `whatsapp://send?phone=…&text=…` scheme first. Only the
//           installed WhatsApp app handles it — opens the chat with that
//           contact pre-loaded. On iOS the URL needs to pass `canOpenURL`,
//           which requires `LSApplicationQueriesSchemes` to include
//           `whatsapp` (handled by expo-config, see app.json).
//        b. If WhatsApp isn't installed (`canOpenURL` false), try the
//           universal `https://wa.me/<digits>?text=…` URL — that one falls
//           back to the App/Play Store if WhatsApp isn't there, or opens it
//           if it is. Either is a reasonable outcome.
//   3. If no phone OR all WhatsApp attempts fail, drop into the OS share
//      sheet (`Share.share`) so the tailor can pick SMS / Mail / etc.
//
// We never throw out of share() — every error path surfaces an Alert and
// resolves. Mutation hook exposes `isPending` so the button can disable.
// ============================================================================

import { useCallback } from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import {
  formatOrderShareMessage,
  phoneToWaMeDigits,
  type OrderShareMessageInput,
} from '@seamflow/utils';
import { useIssueShareLink } from './queries';

export interface ShareOrderInput {
  orderName: string;
  clientName?: string | null;
  /** E.164 (e.g. +234803…). If absent or invalid we skip the WhatsApp deep link. */
  clientPhone?: string | null;
  tailorBusinessName?: string | null;
}

interface ShareResult {
  /** Where the message actually ended up going (best-effort detection). */
  channel: 'whatsapp' | 'share-sheet' | 'cancelled' | 'error';
}

export function useShareOrder(orderId: string) {
  const issue = useIssueShareLink(orderId);

  const share = useCallback(
    async (input: ShareOrderInput): Promise<ShareResult> => {
      try {
        const link = await issue.mutateAsync();
        const message = formatMessage({ ...input, url: link.url });

        const digits = phoneToWaMeDigits(input.clientPhone);
        if (digits) {
          const opened = await tryOpenWhatsApp(digits, message);
          if (opened) return { channel: 'whatsapp' };
        }

        // No phone, or WhatsApp couldn't open. Fall back to the OS share sheet.
        const r = await Share.share({
          message: messageForShareSheet(message, link.url),
          // iOS uses `url` separately; Android collapses it into the message —
          // so we keep the URL inside `message` either way to be safe.
          url: link.url,
        });
        // RN's Share returns { action: 'sharedAction' | 'dismissedAction', activityType? }
        if (r.action === Share.dismissedAction) return { channel: 'cancelled' };
        return { channel: 'share-sheet' };
      } catch (err) {
        Alert.alert(
          'Could not share order',
          err instanceof Error ? err.message : String(err),
        );
        return { channel: 'error' };
      }
    },
    [issue],
  );

  return { share, isPending: issue.isPending };
}

function formatMessage(
  input: ShareOrderInput & { url: string },
): string {
  const payload: OrderShareMessageInput = {
    url: input.url,
    orderName: input.orderName,
    clientName: input.clientName,
    tailorBusinessName: input.tailorBusinessName,
  };
  return formatOrderShareMessage(payload);
}

/**
 * On the OS share sheet the URL would also be carried in the `url` field on
 * iOS, but Android only reads `message`, so we always embed it in the body.
 * The shared formatter already includes "View details: <url>" — nothing
 * special needed here.
 */
function messageForShareSheet(message: string, _url: string): string {
  return message;
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
  // On Android canOpenURL returns true for any scheme by default, so a
  // following openURL still throws if the app isn't installed — we catch
  // that and fall through.
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

  // Universal fallback — works in a browser, redirects to WhatsApp if
  // installed, prompts install otherwise.
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
  // would still succeed via the default browser. Try a blind open as a
  // last attempt, but only on Android — on iOS we trust canOpenURL.
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
