// ============================================================================
// <StatusPill> — "something is happening, carry on".
//
// For background work the user did not ask for and must not be blocked by.
// The case it was built for: the publish screen classifies the photo the
// moment it opens, and 5-7 seconds later chips fill themselves in. Without a
// pill that is startling — the form appears to edit itself. With one it reads
// as the app finishing a job it told you about.
//
// WHAT IT DELIBERATELY IS NOT
//   Not a spinner over the form, not a modal, not a disabled state. The whole
//   point is that the tailor can type a caption and tap chips throughout; the
//   pill is a narrator, never a gate. It occupies one line under the header
//   and takes nothing else away.
//
//   Not a percentage either. We cannot know how far along a model call is, and
//   a bar that pretends to is worse than one that honestly spins — people
//   learn very quickly which progress bars lie.
//
// WHY ActivityIndicator AND NOT A CUSTOM SWEEPING BAR
//   A sweeping progress bar was built first and appeared completely dead —
//   Reanimated and RN core Animated both left the transform pinned at 0. That
//   diagnosis was WRONG, and the real cause is worth recording because it will
//   waste someone else's afternoon: the browser tab under test was HIDDEN, and
//   browsers pause requestAnimationFrame and throttle setTimeout in hidden
//   tabs. Both animation systems drive off rAF on web, so both looked broken
//   while the tab was simply asleep.
//
//   The spinner stays because it is driven by CSS keyframes rather than rAF,
//   so it keeps animating under exactly those conditions, and because a
//   platform indicator needs no measurement, no worklet and no reset trick.
//   The bar is perfectly buildable if it is ever wanted — just verify it in a
//   FOREGROUND tab, or the measurements will lie to you.
//
// LIFECYCLE
//   working → spinner + "what is happening", for as long as it takes
//   done    → tick + "what happened", held briefly
//   gone    → fades and collapses out of the layout entirely
//
// The hold is the part worth keeping. Flicking straight from working to gone
// reads as a glitch; a beat of "Suggestions added" is what turns the chips
// appearing into a consequence rather than a surprise.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { spacing } from '../lib/theme';

/** How long "done" stays up before the pill leaves. */
const DONE_HOLD_MS = 1600;

export type StatusPillPhase = 'idle' | 'working' | 'done';

export function StatusPill({
  phase,
  workingLabel,
  doneLabel,
}: {
  /**
   * Parents only ever move this idle → working → done. Getting back to hidden
   * is the pill's own business, because the parent has no reason to care how
   * long a confirmation should linger.
   */
  phase: StatusPillPhase;
  workingLabel: string;
  /** Null keeps the pill silent on completion and just removes it. */
  doneLabel?: string | null;
}) {
  const { colors } = useAtelierTheme();
  const reduceMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'working') {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
      return;
    }
    if (phase === 'done' && visible) {
      // Only hold if there is something to say. A pill that lingers saying
      // nothing is just clutter in the way of the form.
      const hold = doneLabel ? DONE_HOLD_MS : 250;
      hideTimer.current = setTimeout(() => setVisible(false), hold);
      return;
    }
    if (phase === 'idle') setVisible(false);
  }, [phase, doneLabel, visible]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!visible) return null;

  const done = phase === 'done';
  const label = done ? (doneLabel ?? workingLabel) : workingLabel;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
      exiting={reduceMotion ? undefined : FadeOut.duration(220)}
      style={[
        styles.pill,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.hairline },
      ]}
      // One live region so a screen reader announces the change once, rather
      // than re-reading the line on every frame.
      accessibilityLiveRegion="polite"
    >
      <View style={styles.leading}>
        {done ? (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        ) : (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>
      <Text variant="caption" tone="textMuted" style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    // Fully rounded — the app's local radii scale stops at `lg`.
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  // Fixed width so the label does not shift sideways when the spinner
  // becomes a tick.
  leading: { width: 20, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});
