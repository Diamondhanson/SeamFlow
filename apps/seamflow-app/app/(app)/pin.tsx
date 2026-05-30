// ============================================================================
// PIN lock settings screen — /pin.
//
// Three flows from one screen:
//
//   No PIN yet → enter a new PIN (typed twice for confirmation) → save.
//   PIN exists, "Change PIN" → enter current PIN → enter new PIN twice → save.
//   PIN exists, "Remove PIN"  → enter current PIN → confirm → clear.
//
// Each step is a single stage in the local `stage` state machine so the
// keypad screen + UX stays consistent. The keypad UI itself is a small
// inline component (we don't reuse PinLockScreen because that one is wired
// directly to the lock context — this screen owns its own input loop).
// ============================================================================

import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { useLock } from '../../lib/lock-context';
import {
  PIN_LENGTH,
  clearPin,
  setPin as savePin,
  verifyPin,
} from '../../lib/pin-lock';
import { radii, spacing, useThemeColors } from '../../lib/theme';

type Stage =
  | { kind: 'menu' }
  | { kind: 'enterCurrent'; next: 'change' | 'remove' }
  | { kind: 'enterNew'; mode: 'new' | 'change' }
  | { kind: 'confirmNew'; mode: 'new' | 'change'; firstEntry: string };

export default function PinSettings() {
  const { pinSet, refreshPinState, lock } = useLock();
  const [stage, setStage] = useState<Stage>({ kind: 'menu' });
  const [entry, setEntry] = useState('');
  const [busy, setBusy] = useState(false);

  // ----- menu actions -----
  const start = (target: 'new' | 'change' | 'remove') => {
    setEntry('');
    if (!pinSet && target !== 'new') return;
    if (target === 'new') {
      setStage({ kind: 'enterNew', mode: 'new' });
      return;
    }
    setStage({ kind: 'enterCurrent', next: target });
  };

  const backToMenu = () => {
    setEntry('');
    setStage({ kind: 'menu' });
  };

  // Called when entry hits PIN_LENGTH — interprets the current stage.
  const onComplete = async (pin: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (stage.kind === 'enterCurrent') {
        const r = await verifyPin(pin);
        if (!r.ok) {
          Vibration.vibrate(200);
          Alert.alert('Wrong PIN', 'Try again.');
          setEntry('');
          return;
        }
        if (stage.next === 'change') {
          setStage({ kind: 'enterNew', mode: 'change' });
          setEntry('');
          return;
        }
        // Remove
        Alert.alert('Remove PIN?', 'You can re-add it later from this screen.', [
          { text: 'Cancel', style: 'cancel', onPress: () => backToMenu() },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await clearPin();
              await refreshPinState();
              backToMenu();
              Alert.alert('PIN removed', 'The app will no longer lock.');
            },
          },
        ]);
        return;
      }

      if (stage.kind === 'enterNew') {
        // Capture and move to confirm.
        setStage({ kind: 'confirmNew', mode: stage.mode, firstEntry: pin });
        setEntry('');
        return;
      }

      if (stage.kind === 'confirmNew') {
        if (pin !== stage.firstEntry) {
          Vibration.vibrate(200);
          Alert.alert('PINs don\'t match', 'Try again.');
          setStage({ kind: 'enterNew', mode: stage.mode });
          setEntry('');
          return;
        }
        await savePin(pin);
        await refreshPinState();
        // Re-engage the gate so it's active on next background. We don't
        // call lock() right now — that would force the user to re-enter
        // the PIN they just set, which is annoying. The AppState listener
        // will kick in next time they background.
        Alert.alert(
          stage.mode === 'new' ? 'PIN set' : 'PIN changed',
          'The app will now ask for this PIN if you leave it idle for a few minutes.',
        );
        backToMenu();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
      setEntry('');
    } finally {
      setBusy(false);
    }
  };

  // ----- view -----
  if (stage.kind === 'menu') {
    return (
      <Screen>
        <Text variant="h3">App PIN lock</Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
          {pinSet
            ? 'A PIN is set. The app will lock after 5 minutes in the background.'
            : 'No PIN set. The app will not lock when you switch away.'}
        </Text>

        <View style={{ height: spacing.lg }} />

        {pinSet ? (
          <>
            <Button label="Change PIN" variant="secondary" onPress={() => start('change')} />
            <View style={{ height: spacing.sm }} />
            <Button label="Remove PIN" variant="danger" onPress={() => start('remove')} />
            <View style={{ height: spacing.lg }} />
            <Button
              label="Lock now"
              variant="secondary"
              onPress={() => {
                lock();
                router.replace('/(app)');
              }}
            />
          </>
        ) : (
          <Button label="Set a PIN" onPress={() => start('new')} />
        )}
      </Screen>
    );
  }

  const prompt =
    stage.kind === 'enterCurrent'
      ? 'Enter your current PIN'
      : stage.kind === 'enterNew'
        ? stage.mode === 'change'
          ? 'Enter a new PIN'
          : 'Choose a 4-digit PIN'
        : 'Re-enter the PIN to confirm';

  return (
    <Screen>
      <Text variant="h3">{prompt}</Text>
      <View style={{ height: spacing.lg }} />

      <Keypad
        value={entry}
        onChange={(v) => {
          setEntry(v);
          if (v.length === PIN_LENGTH) {
            // Defer one tick so the dot fills before the dialog appears.
            setTimeout(() => onComplete(v), 80);
          }
        }}
        disabled={busy}
      />

      <View style={{ height: spacing.md }} />
      <Pressable onPress={backToMenu} hitSlop={10}>
        <Text variant="bodySm" tone="textMuted" style={styles.cancel}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

// ----- inline keypad -----

interface KeypadProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

const KEYS: Array<string | 'backspace' | null> = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  null, '0', 'backspace',
];

function Keypad({ value, onChange, disabled }: KeypadProps) {
  const colors = useThemeColors();
  const press = (k: string) => {
    if (disabled) return;
    if (k === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length < PIN_LENGTH) onChange(value + k);
  };

  return (
    <View>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: colors.border },
              i < value.length && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
          />
        ))}
      </View>
      <View style={styles.keypad}>
        {KEYS.map((k, i) =>
          k === null ? (
            <View key={`sp-${i}`} style={styles.key} />
          ) : (
            <Pressable
              key={k + i}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? colors.border : colors.card },
              ]}
              onPress={() => press(k)}
              disabled={disabled}
            >
              <Text variant="h2" numeric style={styles.keyText}>
                {k === 'backspace' ? '⌫' : k}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  key: {
    width: '30%',
    aspectRatio: 1.7,
    margin: '1.5%',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 26 },
  cancel: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
