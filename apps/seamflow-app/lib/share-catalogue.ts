// ============================================================================
// useShareCatalogue — the tailor's own shop link.
//
// Modelled on useShareOrder, and the differences are the interesting part:
//
//   - There is no token and no expiry. An order link is secret and dies; a
//     catalogue link is meant to be pasted into a WhatsApp status, an
//     Instagram bio, or printed on a signboard. It is the same URL forever.
//
//   - There is no recipient. Order sharing knows the client's phone number and
//     can open that exact chat; this one is broadcast, so we lead with the OS
//     share sheet (which reaches WhatsApp status, groups, anything installed)
//     rather than a single conversation.
//
//   - It refuses to share an empty catalogue by default. A first impression is
//     spent once, and a link to a blank page spends it badly. The tailor can
//     still override — it is their shop — but they have to say so.
//
// As with share-order, share() never throws: every failure path ends in a
// dialog and resolves.
// ============================================================================

import { useCallback } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { formatCatalogueShareMessage } from '@seamflow/utils';
import { useCatalogueLink } from './queries';
import { useDialog } from './dialog';
import { useRequireProfile } from './profile-gate';
import { useTranslation } from './i18n';

export interface ShareCatalogueInput {
  /** The shop's name — the message is about them, so it is not optional. */
  tailorBusinessName: string;
}

type Action = 'whatsapp' | 'sheet' | 'copy';

export function useShareCatalogue() {
  const mint = useCatalogueLink();
  const dialog = useDialog();
  const { t } = useTranslation();
  const requireProfile = useRequireProfile();

  const copyLink = useCallback(
    async (url: string): Promise<void> => {
      try {
        await Clipboard.setStringAsync(url);
        await dialog.alert({
          title: t('feed.linkCopied'),
          message: t('feed.linkCopiedBody'),
          tone: 'success',
        });
      } catch (err) {
        await dialog.error(err, { title: t('feed.couldNotCopy') });
      }
    },
    [dialog, t],
  );

  const runShareSheet = useCallback(
    async (message: string, url: string): Promise<void> => {
      try {
        await Share.share({ message, url });
      } catch (err) {
        await dialog.error(err, { title: t('feed.couldNotShareCatalogue') });
      }
    },
    [dialog, t],
  );

  const runWhatsApp = useCallback(
    async (message: string, url: string): Promise<void> => {
      const opened = await tryOpenWhatsApp(message);
      if (!opened) await runShareSheet(message, url);
    },
    [runShareSheet],
  );

  const shareNow = useCallback(
    async (input: ShareCatalogueInput): Promise<void> => {
      try {
        const link = await mint.mutateAsync();

        // Guard the blank-page case before offering any channel.
        if (link.publishedCount === 0) {
          const choice = await dialog.choose<'publish' | 'anyway'>({
            title: t('feed.catalogueEmptyTitle'),
            message: t('feed.catalogueEmptyBody'),
            actions: [
              { label: t('feed.catalogueEmptyAction'), value: 'publish' },
              { label: t('feed.catalogueShareAnyway'), value: 'anyway' },
            ],
          });
          if (choice !== 'anyway') {
            if (choice === 'publish') router.push('/(app)/works');
            return;
          }
        }

        const message = formatCatalogueShareMessage({
          url: link.url,
          tailorBusinessName: input.tailorBusinessName,
        });

        const action = await dialog.choose<Action>({
          title: t('feed.shareCatalogueTitle'),
          // The URL is the body so the tailor can read their own address
          // before sending it — this is the moment they find out what it is.
          message: link.url,
          actions: [
            { label: t('feed.shareOnWhatsApp'), value: 'whatsapp' },
            { label: t('feed.shareVia'), value: 'sheet' },
            { label: t('feed.copyLink'), value: 'copy' },
          ],
        });

        if (action === 'whatsapp') await runWhatsApp(message, link.url);
        else if (action === 'sheet') await runShareSheet(message, link.url);
        else if (action === 'copy') await copyLink(link.url);
      } catch (err) {
        await dialog.error(err, { title: t('feed.couldNotShareCatalogue') });
      }
    },
    [mint, dialog, t, runWhatsApp, runShareSheet, copyLink],
  );

  // Minting the catalogue link is tailor-scoped: gate on a profile first, then
  // resume the share automatically once it's set up.
  const share = useCallback(
    (input: ShareCatalogueInput): void => {
      void requireProfile(() => void shareNow(input), 'gate.needsProfileToPublish');
    },
    [requireProfile, shareNow],
  );

  return { share, isPending: mint.isPending };
}

/**
 * Open WhatsApp with the message pre-filled and NO recipient.
 *
 * `whatsapp://send?text=…` without a `phone` lands on the contact/status
 * picker, which is what broadcast sharing wants — the tailor chooses a group,
 * a status, or several people. Passing a phone here (as share-order does)
 * would be wrong: there is no single recipient for a shop link.
 */
async function tryOpenWhatsApp(message: string): Promise<boolean> {
  const encoded = encodeURIComponent(message);

  const native = `whatsapp://send?text=${encoded}`;
  try {
    if (await Linking.canOpenURL(native)) {
      await Linking.openURL(native);
      return true;
    }
  } catch {
    // fall through
  }

  // wa.me with no number opens WhatsApp's own share target on Android and the
  // web client elsewhere. Worse than the native scheme, better than nothing.
  const wame = `https://wa.me/?text=${encoded}`;
  try {
    if (await Linking.canOpenURL(wame)) {
      await Linking.openURL(wame);
      return true;
    }
  } catch {
    // fall through
  }

  // Some Android setups report canOpenURL false for https yet open it fine.
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(wame);
      return true;
    } catch {
      // give up — caller falls back to the OS share sheet
    }
  }

  return false;
}
