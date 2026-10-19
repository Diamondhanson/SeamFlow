// ============================================================================
// Keeping a progress bar in step with audio, smoothly.
//
// The player reports its position a few times a second. Writing those samples
// straight into the bar makes it step — visibly, because the eye is very good
// at spotting a fixed cadence. Animating TO each sample is no better: the bar
// then spends its whole life catching up to where the audio already was, and
// it lands exactly one interval late at the end.
//
// So each sample starts a linear animation to where playback WILL be one
// interval later, taking exactly one interval to get there. The bar moves at
// the speed of the audio, continuously, on the UI thread — and the next sample
// arrives just as it lands, correcting any drift before it is visible.
//
// Shared by the bubble and the recorder's preview so the two cannot drift
// apart: this is subtle enough that two copies would eventually disagree.
// ============================================================================

import { useEffect } from 'react';
import { Easing, withTiming, type SharedValue } from 'react-native-reanimated';

export function usePlaybackProgress(args: {
  progress: SharedValue<number>;
  /** Seconds. */
  currentTime: number;
  /** Seconds. Zero while the length is still unknown — nothing is written. */
  total: number;
  playing: boolean;
  /** While a finger is on the bar, it owns the value and we keep out. */
  scrubbing: boolean;
  updateMs: number;
}): void {
  const { progress, currentTime, total, playing, scrubbing, updateMs } = args;
  useEffect(() => {
    if (scrubbing || total <= 0) return;
    if (playing) {
      const ahead = Math.min(1, (currentTime + updateMs / 1000) / total);
      progress.value = withTiming(ahead, { duration: updateMs, easing: Easing.linear });
    } else {
      progress.value = Math.max(0, Math.min(1, currentTime / total));
    }
  }, [progress, currentTime, total, playing, scrubbing, updateMs]);
}
