// ============================================================================
// Over-the-air updates: tell the person when one is ready.
//
// expo-updates (checkAutomatically: ON_LOAD) looks for a newer JavaScript bundle
// each time the app opens and downloads it in the background. A downloaded
// update is used on the next cold start by itself. This only handles the other
// case: the app has been sitting in the background and is brought forward with
// an update waiting, where asking is kinder than silently staying on old code.
//
// Asks on coming to the foreground, not the moment the download finishes: a
// dialog is a native modal, and on an iPhone one can't open over another modal
// (see lib/modal-gap.ts). Foreground is when nothing else is on screen. At most
// once per session; "Later" is respected until the app is next opened.
//
// Does nothing in development, Expo Go, or any build without updates enabled.
// ============================================================================

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';
import { settleModals } from './modal-gap';

export function OtaUpdatePrompt() {
  const { isUpdatePending } = Updates.useUpdates();
  const dialog = useDialog();
  const { t } = useTranslation();
  const asked = useRef(false);
  const pending = useRef(false);
  pending.current = isUpdatePending;

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !pending.current || asked.current) return;
      asked.current = true;
      void (async () => {
        await settleModals();
        const restart = await dialog.confirm({
          title: t('appUpdate.title'),
          message: t('appUpdate.body'),
          confirmLabel: t('appUpdate.restart'),
          cancelLabel: t('appUpdate.later'),
        });
        if (restart) await Updates.reloadAsync().catch(() => {});
      })();
    });
    return () => sub.remove();
  }, [dialog, t]);

  return null;
}
