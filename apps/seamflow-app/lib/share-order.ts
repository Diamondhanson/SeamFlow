// ============================================================================
// useShareOrder — Phase 1.6 (+ copy-link action menu)
//
// Flow when the tailor taps "Share with client":
//   1. Mint a fresh magic-link via POST /orders/:id/share-link.
//   2. Present an action menu showing the link, with adaptive options:
//        • Client has an E.164 phone → "Open WhatsApp" + "Copy link"
//        • No phone on file          → "Copy link" + "Share via…"
//      (Android caps Alert at 3 buttons, so we keep it to two actions +
//      Cancel and let "Copy link" cover every other channel.)
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
//      and confirms with a toast/alert.
//
// We never throw out of share() — every error path surfaces an Alert and
// resolves. Mutation hook exposes `isPending` so the button can disable.
// ============================================================================

import { useCallback } from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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

export function useShareOrder(orderId: string) {
  const issue = useIssueShareLink(orderId);

  const share = useCallback(
    async (input: ShareOrderInput): Promise<void> => {
      try {
        const link = await issue.mutateAsync();
        const message = formatMessage({ ...input, url: link.url });
        presentShareMenu({ url: link.url, message, input });
      } catch (err) {
        Alert.alert(
          'Could not share order',
          err instanceof Error ? err.message : String(err),
        );
      }
    },
    [issue],
  );

  return { share, isPending: issue.isPending };
}

/**
 * Show the link + the available delivery actions. The link itself is the
 * Alert body so the tailor can read it before deciding. Adaptive buttons keep
 * within Android's 3-button limit (two actions + Cancel).
 */
function presentShareMenu({
  url,
  message,
  input,
}: {
  url: string;
  message: string;
  input: ShareOrderInput;
}): void {
  const digits = phoneToWaMeDigits(input.clientPhone);

  const actions: Array<{ text: string; onPress: () => void }> = [];
  if (digits) {
    actions.push({
      text: 'Open WhatsApp',
      onPress: () => {
        void runWhatsApp(digits, message, url);
      },
    });
    actions.push({ text: 'Copy link', onPress: () => void copyLink(url) });
  } else {
    actions.push({ text: 'Copy link', onPress: () => void copyLink(url) });
    actions.push({
      text: 'Share via…',
      onPress: () => void openShareSheet(message, url),
    });
  }

  Alert.alert('Share order', url, [
    ...actions,
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/** Copy the raw magic-link URL to the clipboard and confirm. */
async function copyLink(url: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copied', 'The order link is on your clipboard.');
  } catch (err) {
    Alert.alert(
      'Could not copy',
      err instanceof Error ? err.message : String(err),
    );
  }
}

/** Try WhatsApp first; fall back to the OS share sheet if it can't open. */
async function runWhatsApp(
  digits: string,
  message: string,
  url: string,
): Promise<void> {
  const opened = await tryOpenWhatsApp(digits, message);
  if (!opened) await openShareSheet(message, url);
}

/** Open the native share sheet (SMS / Mail / etc.). Never throws. */
async function openShareSheet(message: string, url: string): Promise<void> {
  try {
    await Share.share({
      message: messageForShareSheet(message, url),
      // iOS uses `url` separately; Android collapses it into the message —
      // so we keep the URL inside `message` either way to be safe.
      url,
    });
  } catch (err) {
    Alert.alert(
      'Could not share order',
      err instanceof Error ? err.message : String(err),
    );
  }
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
