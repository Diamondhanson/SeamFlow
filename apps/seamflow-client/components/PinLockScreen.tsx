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
import { Pressable, StyleSheet, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@seamflow/ui';
import { PinDots, Dialpad } from './PinKeypad';
import { useLock } from '../lib/lock-context';
import { useAuth } from '../lib/auth-context';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { MAX_ATTEMPTS, PIN_LENGTH, verifyPin } from '../lib/pin-lock';
import { spacing, useThemeColors } from '../lib/theme';
import { useBreakpoint } from '../lib/use-breakpoint';

interface Props {
  /** Greeting shown above the dots. Default "Enter your PIN". */
  prompt?: string;
}

export function PinLockScreen({ prompt }: Props) {
  const { t } = useTranslation();
  const { unlock } = useLock();
  const { signOut } = useAuth();
  const dialog = useDialog();
  const promptText = prompt ?? t('misc.enterYourPin');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const colors = useThemeColors();
  const { isLandscape } = useBreakpoint();
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
          await dialog.alert({
            title: t('misc.tooManyAttemptsTitle'),
            message: t('misc.tooManyAttemptsBody', { max: MAX_ATTEMPTS }),
            tone: 'error',
          });
          signOut();
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

  // Forgetting the PIN isn't a lockout: the PIN is just a local gate, so the
  // way back in is to sign out and log in again (which clears the PIN and lets
  // them set a new one). Confirm first so an accidental tap doesn't sign them
  // out, and reassure them their data is safe.
  const onForgotPin = async () => {
    const ok = await dialog.confirm({
      title: t('misc.forgotPinConfirmTitle'),
      message: t('misc.forgotPinConfirmBody'),
      confirmLabel: t('misc.forgotPinConfirmCta'),
    });
    if (!ok) return;
    void signOut();
  };

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
      edges={['top', 'bottom', 'left', 'right']}
    >
      {/* Portrait: brand/dots stacked above the keypad. Landscape: the short
          height can't fit them stacked, so they sit side-by-side (brand left,
          keypad right), each centred in its half. */}
      <View style={[styles.container, isLandscape && styles.containerLandscape]}>
        {/* Brand + prompt + dots */}
        <View style={[styles.top, isLandscape && styles.topLandscape]}>
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

        {/* Keypad — pushed low in portrait for thumb reach, centred in landscape */}
        <View style={[styles.bottom, isLandscape && styles.bottomLandscape]}>
          <Dialpad onKey={press} disabled={busy} />
          <Pressable
            onPress={onForgotPin}
            hitSlop={12}
            style={styles.forgotBtn}
          >
            <Text variant="bodySm" tone="textMuted">
              {t('misc.forgotPinSignOut')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  container: { flex: 1 },
  containerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  top: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.lg,
  },
  topLandscape: {
    flex: 1,
    paddingTop: 0,
    justifyContent: 'center',
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
  bottomLandscape: {
    justifyContent: 'center',
    paddingBottom: 0,
  },
  forgotBtn: { alignItems: 'center', marginTop: spacing.xl },
});
