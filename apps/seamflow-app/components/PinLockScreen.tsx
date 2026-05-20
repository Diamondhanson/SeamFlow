// ============================================================================
// PIN entry screen rendered by (app)/_layout when `locked && pinSet`.
//
// Full-screen — covers the entire app behind it. Numeric keypad rendered
// inline so the OS keyboard doesn't show (and so users on Android with
// random keyboard layouts get the same UX as iOS).
//
// On successful verify: call unlock() from the LockContext.
// On 5 failed attempts: force sign-out (which dumps the Supabase session
// — the user has to go back through sign-in. The PIN itself stays stored
// so once they sign in again, the lock continues to engage.)
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import { useLock } from '../lib/lock-context';
import { useAuth } from '../lib/auth-context';
import { MAX_ATTEMPTS, PIN_LENGTH, verifyPin } from '../lib/pin-lock';
import { colors, radii, spacing } from '../lib/theme';

const KEYS: Array<string | 'backspace' | null> = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  null, '0', 'backspace',
];

interface Props {
  /**
   * Greeting shown above the dots. Default "Enter your PIN".
   * The PIN setup screen reuses this component with different greetings
   * when prompting for the current PIN before a change.
   */
  prompt?: string;
}

export function PinLockScreen({ prompt = 'Enter your PIN' }: Props) {
  const { unlock } = useLock();
  const { signOut } = useAuth();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  // Auto-verify when 4 digits have been entered.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const result = await verifyPin(pin);
        if (cancelled) return;
        if (result.ok) {
          unlock();
          return;
        }
        // Bad PIN — wiggle + clear.
        Vibration.vibrate(200);
        setPin('');
        setFailedCount(result.failed);

        if (result.shouldSignOut) {
          Alert.alert(
            'Too many attempts',
            `${MAX_ATTEMPTS} wrong tries. Signing you out — please sign in again to continue.`,
            [{ text: 'OK', onPress: () => void signOut() }],
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, busy, unlock, signOut]);

  const press = (key: string) => {
    if (busy) return;
    if (key === 'backspace') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => (p.length < PIN_LENGTH ? p + key : p));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.brand}>SeamFlow</Text>
        <Text style={styles.prompt}>{prompt}</Text>

        {/* Dots */}
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </View>

        {failedCount > 0 ? (
          <Text style={styles.error}>
            Wrong PIN. {MAX_ATTEMPTS - failedCount} attempt
            {MAX_ATTEMPTS - failedCount === 1 ? '' : 's'} left.
          </Text>
        ) : null}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((k, i) =>
          k === null ? (
            <View key={`spacer-${i}`} style={styles.key} />
          ) : (
            <Pressable
              key={k + i}
              style={({ pressed }) => [
                styles.key,
                pressed && styles.keyPressed,
              ]}
              onPress={() => press(k)}
              disabled={busy}
            >
              <Text style={styles.keyText}>
                {k === 'backspace' ? '⌫' : k}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      <Pressable onPress={() => void signOut()} hitSlop={12}>
        <Text style={styles.forgot}>Forgot PIN? Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center' },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  prompt: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    aspectRatio: 1.7,
    margin: '1.5%',
    borderRadius: radii.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.border },
  keyText: { color: colors.text, fontSize: 26, fontWeight: '500' },
  forgot: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
