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
import { Alert, Pressable, StyleSheet, View, Vibration } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { PinDots, Dialpad } from '../../components/PinKeypad';
import { useLock } from '../../lib/lock-context';
import { useTranslation } from '../../lib/i18n';
import {
  PIN_LENGTH,
  clearPin,
  setPin as savePin,
  verifyPin,
} from '../../lib/pin-lock';
import { spacing } from '../../lib/theme';

type Stage =
  | { kind: 'menu' }
  | { kind: 'enterCurrent'; next: 'change' | 'remove' }
  | { kind: 'enterNew'; mode: 'new' | 'change' }
  | { kind: 'confirmNew'; mode: 'new' | 'change'; firstEntry: string };

export default function PinSettings() {
  const { t } = useTranslation();
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
          Alert.alert(t('misc.wrongPinTitle'), t('misc.tryAgain'));
          setEntry('');
          return;
        }
        if (stage.next === 'change') {
          setStage({ kind: 'enterNew', mode: 'change' });
          setEntry('');
          return;
        }
        // Remove
        Alert.alert(t('misc.removePinTitle'), t('misc.removePinBody'), [
          { text: t('common.cancel'), style: 'cancel', onPress: () => backToMenu() },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: async () => {
              await clearPin();
              await refreshPinState();
              backToMenu();
              Alert.alert(t('misc.pinRemovedTitle'), t('misc.pinRemovedBody'));
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
          Alert.alert(t('misc.pinsDontMatchTitle'), t('misc.tryAgain'));
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
          stage.mode === 'new' ? t('misc.pinSetTitle') : t('misc.pinChangedTitle'),
          t('misc.pinSavedBody'),
        );
        backToMenu();
      }
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      setEntry('');
    } finally {
      setBusy(false);
    }
  };

  // ----- view -----
  if (stage.kind === 'menu') {
    return (
      <Screen>
        <ScreenHeader title={t('misc.pinLockTitle')} />
        <Text variant="h3">{t('misc.appPinLock')}</Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
          {pinSet
            ? t('misc.pinSetDescription')
            : t('misc.noPinDescription')}
        </Text>

        <View style={{ height: spacing.lg }} />

        {pinSet ? (
          <>
            <Button label={t('misc.changePin')} variant="secondary" onPress={() => start('change')} />
            <View style={{ height: spacing.sm }} />
            <Button label={t('misc.removePin')} variant="danger" onPress={() => start('remove')} />
            <View style={{ height: spacing.lg }} />
            <Button
              label={t('misc.lockNow')}
              variant="secondary"
              onPress={() => {
                lock();
                router.replace('/(app)');
              }}
            />
          </>
        ) : (
          <Button label={t('misc.setAPin')} onPress={() => start('new')} />
        )}
      </Screen>
    );
  }

  const prompt =
    stage.kind === 'enterCurrent'
      ? t('misc.enterCurrentPin')
      : stage.kind === 'enterNew'
        ? stage.mode === 'change'
          ? t('misc.enterNewPin')
          : t('misc.choosePin')
        : t('misc.reenterPin');

  const handleKey = (k: string) => {
    if (busy) return;
    const next =
      k === 'backspace'
        ? entry.slice(0, -1)
        : entry.length < PIN_LENGTH
          ? entry + k
          : entry;
    if (next === entry) return;
    setEntry(next);
    if (next.length === PIN_LENGTH) {
      // Defer one tick so the last dot fills before the dialog appears.
      setTimeout(() => onComplete(next), 80);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t('misc.pinLockTitle')} onBack={backToMenu} />
      <View style={styles.flow}>
        {/* Prompt + PIN indicator — centred in the upper region. */}
        <View style={styles.promptArea}>
          <Text variant="h3" style={styles.prompt}>
            {prompt}
          </Text>
          <PinDots value={entry} />
        </View>

        {/* Dialpad — floats in the lower region, lifted off the very bottom.
            flex 2 : 3 keeps the split proportional on any device height. */}
        <View style={styles.dialArea}>
          <Dialpad onKey={handleKey} disabled={busy} />
          <Pressable onPress={backToMenu} hitSlop={10} style={styles.cancelBtn}>
            <Text variant="bodySm" tone="textMuted">
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flow: { flex: 1 },
  // Upper region: prompt + PIN dots, centred.
  promptArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  prompt: { textAlign: 'center' },
  // Lower region: the dialpad floats here, lifted off the very bottom.
  dialArea: {
    flex: 3,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
