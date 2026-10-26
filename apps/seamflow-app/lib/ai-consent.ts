// ============================================================================
// Asking before anything is sent to the AI provider.
//
// Several features send what the person chose — a photo, some notes, or (for the
// assistant) the client, order and measurement details it looks up — to a third
// party, Anthropic, which runs the model. App Store guideline 5.1.2(i) requires
// that people are told this and agree BEFORE it happens, so every AI entry point
// goes through `ensure()` first.
//
// Rules, kept deliberately small:
//   - agreement is remembered per account on this phone, so it is asked once;
//   - declining remembers nothing: the feature simply does not run, and tapping
//     it again asks again, because the person has just asked for it again;
//   - nothing else in the app depends on it. Declining only switches off the
//     features that send data.
// ============================================================================

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth-context';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';
import { openLegal } from './legal-links';

/** Per account, so two people sharing a phone each answer for themselves. */
export const aiConsentKey = (userId: string): string => `seamflow.aiConsent.v1.${userId}`;

/**
 * `ensure()` resolves true when the person has agreed (now or earlier) and false
 * when they said no or there is no signed-in account to attach the answer to.
 * `revoke()` forgets an earlier agreement.
 */
export function useAiConsent(): {
  ensure: () => Promise<boolean>;
  isGranted: () => Promise<boolean>;
  revoke: () => Promise<void>;
} {
  const { session } = useAuth();
  const dialog = useDialog();
  const { t, language } = useTranslation();
  const userId = session?.user.id ?? null;

  const isGranted = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      return (await AsyncStorage.getItem(aiConsentKey(userId))) === '1';
    } catch {
      return false;
    }
  }, [userId]);

  const ensure = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    if (await isGranted()) return true;

    // "Read the privacy policy" opens the policy and then asks again, so reading
    // it is never a way of accidentally agreeing or of losing the question.
    for (;;) {
      const answer = await dialog.choose<'allow' | 'policy'>({
        title: t('aiConsent.title'),
        message: t('aiConsent.body'),
        actions: [
          { label: t('aiConsent.allow'), value: 'allow' },
          { label: t('aiConsent.readPolicy'), value: 'policy' },
        ],
        cancelLabel: t('aiConsent.decline'),
      });
      if (answer === 'policy') {
        await openLegal('privacy', language);
        continue;
      }
      if (answer !== 'allow') return false;
      try {
        await AsyncStorage.setItem(aiConsentKey(userId), '1');
      } catch {
        // Could not remember it; they will simply be asked again next time.
      }
      return true;
    }
  }, [userId, isGranted, dialog, t, language]);

  const revoke = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(aiConsentKey(userId));
    } catch {
      // nothing to do
    }
  }, [userId]);

  return { ensure, isGranted, revoke };
}
