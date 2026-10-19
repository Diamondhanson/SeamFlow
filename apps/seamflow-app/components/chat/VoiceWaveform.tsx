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
// value changes on the UI thread and the fill slides.
//
// WHY THE BAR WIDTH IS AN INTEGER
//
// The two copies must land on exactly the same pixels. They used to be laid
// out independently — the base row with `flex: 1` bars, the clipped copy
// inside a box of its own width — and 44 fractional widths rounded differently
// between them, so every bar carried a half-pixel ghost of itself. It read as
// a drop shadow nobody asked for.
//
// So the width is computed once, floored to a whole pixel, and handed to both
// copies. Identical by construction rather than by coincidence. It is also
// capped: a note whose waveform is only a few samples long would otherwise
// stretch into fat lozenges that look nothing like sound.
//
// WHEN THERE IS NO WAVEFORM
//
// Some devices report no recording levels. Rather than invent a shape, the
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
const BAR_MAX_W = 4;
const BAR_MIN_W = 2;
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

  const count = waveform.length;
  // Whole pixels, so both copies of the row land identically.
  const barW = count
    ? Math.max(
        BAR_MIN_W,
        Math.min(BAR_MAX_W, Math.floor((width - BAR_GAP * (count - 1)) / count)),
      )
    : BAR_MIN_W;
  const rowW = count ? barW * count + BAR_GAP * (count - 1) : width;

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

  /** One copy of the row. Both get the same numbers, never a flex guess. */
  const row = (color: string) =>
    count > 0 ? (
      <View style={[styles.row, { height, width: rowW }]}>
        {waveform.map((level, i) => (
          <View
            key={i}
            style={{
              width: barW,
              backgroundColor: color,
              borderRadius: barW / 2,
              // Never zero: a silent moment should read as a quiet bar, not a
              // gap in the row.
              height: Math.max(height * MIN_BAR_RATIO, (level / 100) * height),
            }}
          />
        ))}
      </View>
    ) : (
      <View style={[styles.row, { height, width: width || undefined }]}>
        <View style={[styles.track, { backgroundColor: color }]} />
      </View>
    );

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
        {width > 0 ? row(track) : null}
        {width > 0 ? (
          <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none">
            {row(tint)}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP },
  track: { flex: 1, height: 4, borderRadius: 999 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
});
