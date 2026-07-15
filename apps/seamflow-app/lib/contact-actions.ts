// ============================================================================
// useContactActions — tap a client's phone number to Call / WhatsApp / Message.
//
// Returns a function you call with a phone number; it shows a small centered
// chooser and opens the right app via Linking. WhatsApp is only offered when
// the number has enough digits to form a wa.me link. Reuses phoneToWaMeDigits
// from @seamflow/utils (the same helper the order-share flow uses).
// ============================================================================

import { Linking, Platform } from 'react-native';
import { phoneToWaMeDigits } from '@seamflow/utils';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

type ContactChoice = 'call' | 'whatsapp' | 'sms';

export function useContactActions() {
  const dialog = useDialog();
  const { t } = useTranslation();

  return async (phone: string | null | undefined): Promise<void> => {
    if (!phone) return;
    const digits = phoneToWaMeDigits(phone);
    const tel = phone.replace(/[^\d+]/g, '');

    const actions = [
      { label: t('clients.callAction'), value: 'call' as const },
      ...(digits ? [{ label: t('clients.whatsappAction'), value: 'whatsapp' as const }] : []),
      { label: t('clients.smsAction'), value: 'sms' as const },
    ];

    const choice = await dialog.choose<ContactChoice>({
      title: t('clients.contactTitle'),
      message: phone,
      actions,
    });
    if (!choice) return;

    try {
      if (choice === 'call') {
        await Linking.openURL(`tel:${tel}`);
      } else if (choice === 'sms') {
        await Linking.openURL(`sms:${tel}`);
      } else if (choice === 'whatsapp' && digits) {
        // Try the native scheme first, then the universal wa.me link.
        const native = `whatsapp://send?phone=${digits}`;
        const wame = `https://wa.me/${digits}`;
        try {
          if (await Linking.canOpenURL(native)) {
            await Linking.openURL(native);
            return;
          }
        } catch {
          // fall through to wa.me
        }
        // canOpenURL is unreliable for https on Android — blind-open there.
        if (Platform.OS === 'android' || (await Linking.canOpenURL(wame))) {
          await Linking.openURL(wame);
        }
      }
    } catch (err) {
      await dialog.error(err);
    }
  };
}
