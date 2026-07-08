// ============================================================================
// useShareInvoice — mint a public invoice link and hand it to the client.
//
// Mirrors useShareOrder: mint a fresh link (POST /invoices/:id/link, which also
// marks the invoice "sent"), then present WhatsApp / copy-link / OS-share via
// the centered dialog. Never throws — every path resolves with a dialog.
// ============================================================================

import { useCallback } from 'react';
import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  formatInvoiceShareMessage,
  phoneToWaMeDigits,
} from '@seamflow/utils';
import { useIssueInvoiceLink } from './queries';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

export interface ShareInvoiceInput {
  invoiceNumber: string;
  clientName?: string | null;
  /** E.164; if present we offer the WhatsApp deep link. */
  clientPhone?: string | null;
  tailorBusinessName?: string | null;
}

export function useShareInvoice(invoiceId: string) {
  const issue = useIssueInvoiceLink(invoiceId);
  const dialog = useDialog();
  const { t } = useTranslation();

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

  const runShareSheet = useCallback(
    async (message: string, url: string): Promise<void> => {
      try {
        await Share.share({ message, url });
      } catch (err) {
        await dialog.error(err, { title: t('invoices.couldNotShare') });
      }
    },
    [dialog, t],
  );

  const runWhatsApp = useCallback(
    async (digits: string, message: string, url: string): Promise<void> => {
      const opened = await tryOpenWhatsApp(digits, message);
      if (!opened) await runShareSheet(message, url);
    },
    [runShareSheet],
  );

  const share = useCallback(
    async (input: ShareInvoiceInput): Promise<void> => {
      try {
        const link = await issue.mutateAsync();
        const message = formatInvoiceShareMessage({
          url: link.url,
          invoiceNumber: input.invoiceNumber,
          clientName: input.clientName,
          tailorBusinessName: input.tailorBusinessName,
        });
        const digits = phoneToWaMeDigits(input.clientPhone);

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
          title: t('invoices.shareTitle'),
          message: link.url,
          actions,
        });

        if (action === 'whatsapp' && digits) await runWhatsApp(digits, message, link.url);
        else if (action === 'copy') await copyLink(link.url);
        else if (action === 'sheet') await runShareSheet(message, link.url);
      } catch (err) {
        await dialog.error(err, { title: t('invoices.couldNotShare') });
      }
    },
    [issue, dialog, t, copyLink, runWhatsApp, runShareSheet],
  );

  return { share, isPending: issue.isPending };
}

async function tryOpenWhatsApp(digits: string, message: string): Promise<boolean> {
  const encoded = encodeURIComponent(message);
  const native = `whatsapp://send?phone=${digits}&text=${encoded}`;
  try {
    if (await Linking.canOpenURL(native)) {
      await Linking.openURL(native);
      return true;
    }
  } catch {
    /* fall through */
  }
  const wame = `https://wa.me/${digits}?text=${encoded}`;
  try {
    if (await Linking.canOpenURL(wame)) {
      await Linking.openURL(wame);
      return true;
    }
  } catch {
    /* fall through */
  }
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(wame);
      return true;
    } catch {
      /* give up */
    }
  }
  return false;
}
