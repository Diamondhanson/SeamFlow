// ============================================================================
// Asks a designer, every now and then, to protect their shop with a PIN.
// Mount it once on the designer home. The rules are in lib/pin-reminder.
// ============================================================================

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth-context';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';
import { useLock } from './lock-context';
import { PIN_LENGTH } from './pin-lock';
import { pinReminderKey, shouldRemindAboutPin } from './pin-reminder';
import { useMe } from './queries';
import { shopSetup } from './shop-setup';

/**
 * Let the screen settle first. The home screen is busy for its first moments —
 * data arriving, the first-run slides on a new account — and a dialog dropped on
 * top of that is dismissed by reflex without being read.
 */
const SETTLE_MS = 2500;

export function usePinReminder(): void {
  const { session } = useAuth();
  const { data: me } = useMe();
  const { ready, pinSet, locked } = useLock();
  const dialog = useDialog();
  const { t } = useTranslation();

  const userId = session?.user.id ?? null;
  const shopComplete = shopSetup(me) === 'complete';
  // Once per visit to the home screen at most, however often its data refreshes.
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    if (!ready || !userId || pinSet || locked || !shopComplete) return;

    const timer = setTimeout(async () => {
      if (decided.current) return;
      decided.current = true;

      const key = pinReminderKey(userId);
      let lastShownAt: number | null = null;
      try {
        const raw = await AsyncStorage.getItem(key);
        lastShownAt = raw === null ? null : Number(raw);
      } catch {
        // Unreadable storage: behave as if never asked.
      }

      const now = Date.now();
      if (!shouldRemindAboutPin({ now, lastShownAt, pinSet, shopComplete })) return;

      // Stamp BEFORE asking, so quitting with the dialog open doesn't re-ask next launch.
      try {
        await AsyncStorage.setItem(key, String(now));
      } catch {
        // If this fails we may ask again sooner than a week; harmless.
      }

      const wantsPin = await dialog.confirm({
        title: t('misc.pinReminderTitle'),
        message: t('misc.pinReminderBody', { digits: PIN_LENGTH }),
        confirmLabel: t('misc.pinReminderSet'),
        cancelLabel: t('misc.pinReminderLater'),
        tone: 'info',
      });
      if (wantsPin) router.push('/(app)/pin');
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [ready, userId, pinSet, locked, shopComplete, dialog, t]);
}
