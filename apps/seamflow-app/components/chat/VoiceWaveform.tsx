// ============================================================================
// The waveform — drawn once, used by the recorder, the preview and the bubble.
//
// TWO MODES, AND WHY
//
// With a `progress` value it is a PLAYER: the row is drawn twice, once muted
// and once in the accent, and the accent copy sits in a clipping box whose
// width is a Reanimated shared value. Nothing re-renders while a note plays.
//
// Without one it is a PICTURE: a single row in the accent. The recorder's live
// row has nothing to seek through, and wrapping it in an animated clip that is
// pinned at 100% forever meant depending on Reanimated to apply a style that
// never changes — which it did not do on the web, leaving the live row drawn
// only in its muted under-copy. A row that needs no animation does not get one.
//
// THE TWO COPIES MUST SIT IN THE SAME BOX
//
// This is what made every bar carry a shadow. The muted row was a normal child
// of a `flex: 1` stage and was centred by it; the accent row lived in an
// absolutely-positioned box and sat at the top of it. The stage's real height
// was never the height asked for — `flex: 1` overrides it — so the two rows
// were centred against different numbers and landed a few pixels apart. With
// rounded bar caps, the offset copy peeked out above as a lighter ghost.
//
// So the stage now has a definite height and no flex, and BOTH rows are
// centred the same way. They cannot drift, because there is nothing left for
// them to drift against.
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
  /** Peaks, 0–100. Empty renders a plain track instead. */
  waveform: number[];
  /**
   * 0–1, driven on the UI thread. Omit for a still picture of the whole
   * waveform in `tint` — which is what the recorder's live row wants.
   */
  progress?: SharedValue<number>;
  /** Colour of the played portion, or of the whole row when still. */
  tint: string;
  /** Colour of the rest. Unused when there is no progress. */
  track: string;
  height?: number;
  /** Called with a 0–1 ratio when the row is tapped or dragged. */
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
  // Whole pixels, so both copies of the row land on the same ones.
  const barW = count
    ? Math.max(
        BAR_MIN_W,
        Math.min(BAR_MAX_W, Math.floor((width - BAR_GAP * (count - 1)) / count)),
      )
    : BAR_MIN_W;

  // Only ever read when `progress` is given; the still case never mounts it.
  const fillStyle = useAnimatedStyle(() => ({
    width: progress ? Math.max(0, Math.min(1, progress.value)) * width : width,
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
      if (width > 0 && progress) progress.value = Math.max(0, Math.min(1, e.x / width));
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
      if (width > 0 && progress) progress.value = Math.max(0, Math.min(1, e.x / width));
      runOnJS(seekTo)(e.x);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  /**
   * One copy of the row, absolutely positioned and centred.
   *
   * Absolute for both copies on purpose: it is the only arrangement where the
   * muted row and the accent row are laid out by the same rules, which is the
   * whole of the shadow fix.
   */
  const row = (color: string) =>
    count > 0 ? (
      <View style={[styles.row, { height }]}>
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
      <View style={[styles.row, { height }]}>
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
        {width > 0 && progress ? (
          <View style={styles.layer} pointerEvents="none">
            {row(track)}
          </View>
        ) : null}
        {/* A still row is a plain View. Reanimated is for things that move,
            and asking it to hold a constant was exactly how the live row
            ended up invisible on the web. */}
        {width > 0 && !progress ? (
          <View style={[styles.layer, { width }]} pointerEvents="none">
            {row(tint)}
          </View>
        ) : null}
        {width > 0 && progress ? (
          <Animated.View style={[styles.layer, fillStyle]} pointerEvents="none">
            {row(tint)}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // No `flex: 1`: it would override the height this box is given, and the two
  // rows inside it would then be centred against a number nobody chose.
  stage: { width: '100%', justifyContent: 'center' },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP },
  track: { flex: 1, height: 4, borderRadius: 999 },
});
