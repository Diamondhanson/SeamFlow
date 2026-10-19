// ============================================================================
// The waveform — drawn once, used by the recorder, the preview and the bubble.
//
// HOW THE PLAYED PORTION IS COLOURED
//
// Not by re-rendering bars as playback moves: that would be forty React
// updates several times a second, on a row inside a FlatList, which is exactly
// how a chat thread starts to stutter.
//
// Instead the row is drawn TWICE — once in the muted colour, once in the
// accent — and the accent copy sits in a clipping box whose width is a
// Reanimated shared value. Nothing re-renders while a note plays; a single
// value changes on the UI thread and the fill slides. The second copy is given
// the measured width explicitly so clipping REVEALS it rather than squashing
// it, which is the part that is easy to get wrong.
//
// WHEN THERE IS NO WAVEFORM
//
// Some devices report no recording levels at all. Rather than invent a shape —
// a decorative squiggle that implies information it does not have — the
// component falls back to a plain progress track. It is honest, it still
// scrubs, and most people will never notice which one they are looking at.
// ============================================================================

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

const BAR_GAP = 2;
const MIN_BAR_RATIO = 0.16;

export interface VoiceWaveformProps {
  /** Peaks, 0–100. Empty renders the plain track instead. */
  waveform: number[];
  /** 0–1, driven on the UI thread. */
  progress: SharedValue<number>;
  /** Colour of the played portion. */
  tint: string;
  /** Colour of the rest. */
  track: string;
  height?: number;
  /**
   * Called with a 0–1 ratio when the row is tapped or dragged. Omit to make
   * the waveform decorative — which is what the recorder wants, since there is
   * nothing to seek through yet.
   */
  onSeek?: (ratio: number) => void;
  /** While the user is dragging, so the caller can stop re-syncing progress. */
  onScrubbingChange?: (scrubbing: boolean) => void;
}

export function VoiceWaveform({
  waveform,
  progress,
  tint,
  track,
  height = 26,
  onSeek,
  onScrubbingChange,
}: VoiceWaveformProps) {
  const [width, setWidth] = useState(0);

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, Math.min(1, progress.value)) * width,
  }));

  const seekTo = (x: number) => {
    if (width <= 0 || !onSeek) return;
    onSeek(Math.max(0, Math.min(1, x / width)));
  };

  const setScrubbing = (v: boolean) => onScrubbingChange?.(v);

  // activeOffsetX keeps a vertical drag belonging to the thread: the row only
  // takes over once the finger has clearly moved sideways. Without it, every
  // attempt to scroll past a voice note would scrub it instead.
  const pan = Gesture.Pan()
    .enabled(!!onSeek)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      'worklet';
      runOnJS(setScrubbing)(true);
    })
    .onUpdate((e) => {
      'worklet';
      if (width > 0) progress.value = Math.max(0, Math.min(1, e.x / width));
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(seekTo)(e.x);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setScrubbing)(false);
    });

  const tap = Gesture.Tap()
    .enabled(!!onSeek)
    .maxDuration(300)
    .onEnd((e) => {
      'worklet';
      if (width > 0) progress.value = Math.max(0, Math.min(1, e.x / width));
      runOnJS(seekTo)(e.x);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const bars = (color: string, explicitWidth?: number) => (
    <View
      style={[
        styles.row,
        { height },
        explicitWidth != null ? { width: explicitWidth } : styles.flex,
      ]}
    >
      {waveform.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              // Never zero: a silent moment should read as a quiet bar, not a
              // gap in the row.
              height: Math.max(height * MIN_BAR_RATIO, (level / 100) * height),
            },
          ]}
        />
      ))}
    </View>
  );

  const plain = (color: string, explicitWidth?: number) => (
    <View
      style={[
        styles.row,
        { height },
        explicitWidth != null ? { width: explicitWidth } : styles.flex,
      ]}
    >
      <View style={[styles.track, { backgroundColor: color }]} />
    </View>
  );

  const draw = waveform.length > 0 ? bars : plain;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.stage, { height }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        // The whole row is the control, so it announces itself as one rather
        // than as forty unlabelled rectangles.
        accessible={!!onSeek}
        accessibilityRole={onSeek ? 'adjustable' : 'none'}
      >
        {draw(track)}
        {width > 0 ? (
          <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none">
            {draw(tint, width)}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP },
  // flex:1 rather than a fixed bar width: the row then fills whatever the
  // bubble gives it, so the same forty-four bars look right on a small phone
  // and on a tablet without a second layout.
  bar: { flex: 1, borderRadius: 999, minWidth: 1 },
  track: { flex: 1, height: 4, borderRadius: 999 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
});
