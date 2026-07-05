// ============================================================================
// PIN entry screen rendered by (app)/_layout when `locked && pinSet`.
//
// Full-screen — covers the entire app behind it. Numeric keypad rendered
// inline so the OS keyboard doesn't show. Keypad + dots come from the shared
// <PinKeypad> so this matches the PIN settings screen exactly.
//
// On successful verify: call unlock() from the LockContext.
// On MAX_ATTEMPTS failed attempts: force sign-out.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@seamflow/ui';
import { PinDots, Dialpad } from './PinKeypad';
import { useLock } from '../lib/lock-context';
import { useAuth } from '../lib/auth-context';
import { useTranslation } from '../lib/i18n';
import { MAX_ATTEMPTS, PIN_LENGTH, verifyPin } from '../lib/pin-lock';
import { spacing, useThemeColors } from '../lib/theme';

interface Props {
  /** Greeting shown above the dots. Default "Enter your PIN". */
  prompt?: string;
}

export function PinLockScreen({ prompt }: Props) {
  const { t } = useTranslation();
  const { unlock } = useLock();
  const { signOut } = useAuth();
  const promptText = prompt ?? t('misc.enterYourPin');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const colors = useThemeColors();
  const verifyingRef = useRef(false);

  // Verify once the last digit lands.
  //
  // IMPORTANT: depend ONLY on `pin`. The previous version listed `busy` in the
  // deps, so `setBusy(true)` re-ran this effect; its cleanup set the in-flight
  // flag to cancelled, and when verifyPin resolved it bailed *before* calling
  // unlock() — the PIN was correct but the app never unlocked (and busy stuck
  // on). A ref now guards re-entry instead.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy(true);
    let active = true;
    (async () => {
      try {
        const result = await verifyPin(pin);
        if (!active) return;
        if (result.ok) {
          unlock();
          return;
        }
        // Wrong PIN — wiggle + clear.
        Vibration.vibrate(200);
        setPin('');
        setFailedCount(result.failed);
        if (result.shouldSignOut) {
          Alert.alert(
            t('misc.tooManyAttemptsTitle'),
            t('misc.tooManyAttemptsBody', { max: MAX_ATTEMPTS }),
            [{ text: t('common.ok'), onPress: () => void signOut() }],
          );
        }
      } finally {
        verifyingRef.current = false;
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const press = (key: string) => {
    if (busy) return;
    if (key === 'backspace') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => (p.length < PIN_LENGTH ? p + key : p));
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      edges={['top', 'bottom']}
    >
      {/* Brand + prompt + dots — upper region */}
      <View style={styles.top}>
        <Text variant="display" style={styles.brand}>
          SeamFlow
        </Text>
        <Text variant="bodySm" tone="textMuted">
          {promptText}
        </Text>
        <PinDots value={pin} />
        {failedCount > 0 ? (
          <Text variant="caption" tone="danger" style={styles.error}>
            {t('misc.wrongPinAttempts', {
              left: MAX_ATTEMPTS - failedCount,
              plural: MAX_ATTEMPTS - failedCount === 1 ? '' : 's',
            })}
          </Text>
        ) : null}
      </View>

      {/* Keypad pushed to the lower region for easy thumb reach */}
      <View style={styles.bottom}>
        <Dialpad onKey={press} disabled={busy} />
        <Pressable
          onPress={() => void signOut()}
          hitSlop={12}
          style={styles.forgotBtn}
        >
          <Text variant="bodySm" tone="textMuted">
            {t('misc.forgotPinSignOut')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  top: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.lg,
  },
  brand: { marginBottom: spacing.xs },
  error: { fontWeight: '600' },
  // flex:1 + flex-end pushes the keypad down toward the thumb; the small
  // bottom padding keeps it off the very edge.
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  forgotBtn: { alignItems: 'center', marginTop: spacing.xl },
});
