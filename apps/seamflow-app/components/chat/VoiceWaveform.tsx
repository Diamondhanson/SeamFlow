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

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { resampleWaveform } from '../../lib/waveform';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

/** What the gap shrinks to before bars start being dropped, and spreads to at most. */
const BAR_MIN_GAP = 1;
const BAR_MAX_GAP = 4;
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

  // ── Making the row fit, which it did not ────────────────────────────────
  //
  // Forty-four bars two pixels wide with two-pixel gaps need 174px. The
  // waveform in a chat bubble gets about 148 — the bubble's 190 minimum, less
  // the play button and the gap beside it. The bars were laid out at that
  // natural 174 inside a box that was positioned but never given a width, so
  // the box grew to fit them and painted out past the bubble and over the
  // thread. `overflow: hidden` could not help: the content fitted the box
  // exactly, and it was the box that was too wide.
  //
  // Nothing here may be allowed to depend on the bubble staying a particular
  // size, so the row is built from the width it is actually given. First work
  // out how many bars of the smallest allowed size fit, and resample down to
  // that if there are more — resampling rather than clipping, because the end
  // of a sentence is as much a part of its shape as the start, and a row that
  // silently loses its last second is worse than one drawn slightly coarser.
  // Then spend whatever space is left over widening the bars and the gaps
  // back towards their preferred size.
  const fitCount =
    width > 0
      ? Math.max(1, Math.floor((width + BAR_MIN_GAP) / (BAR_MIN_W + BAR_MIN_GAP)))
      : waveform.length;
  const bars = useMemo(
    () => (waveform.length <= fitCount ? waveform : resampleWaveform(waveform, fitCount)),
    [waveform, fitCount],
  );

  const count = bars.length;
  // Whole pixels for the bars, so both copies of the row land on the same ones
  // and a two-pixel bar never renders as a grey smear.
  const barW = count
    ? Math.max(
        BAR_MIN_W,
        Math.min(BAR_MAX_W, Math.floor((width - BAR_MIN_GAP * (count - 1)) / count)),
      )
    : BAR_MIN_W;
  // The gap takes whatever is left over, and is deliberately NOT rounded. With
  // forty-four bars, a whole-pixel gap can only ever land on 1 or 2 — 131px or
  // 174px in a 148px row, so either a stripe of dead space on the right or an
  // overflow. A fractional gap divides the remainder evenly and the row ends
  // exactly where it should. Both copies compute it identically, so they still
  // agree to the pixel. Capped, so a note with only a few bars reads as a
  // waveform rather than a dotted line.
  const gap =
    count > 1
      ? Math.max(BAR_MIN_GAP, Math.min(BAR_MAX_GAP, (width - count * barW) / (count - 1)))
      : 0;

  /**
   * What the row actually occupies.
   *
   * Not the same as `width`: bars stop growing at BAR_MAX_W, so a wide bubble
   * leaves a tail of empty space. Progress and seeking are measured against
   * THIS, or the fill would run ahead of the bars it is supposed to be
   * colouring in and a tap near the end would seek past where the row stops.
   */
  const rowW = count > 0 ? Math.min(width, count * barW + gap * (count - 1)) : width;

  // Only ever read when `progress` is given; the still case never mounts it.
  const fillStyle = useAnimatedStyle(() => ({
    width: progress ? Math.max(0, Math.min(1, progress.value)) * rowW : rowW,
  }));

  const seekTo = (x: number) => {
    if (rowW <= 0 || !onSeek) return;
    onSeek(Math.max(0, Math.min(1, x / rowW)));
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
      if (rowW > 0 && progress) progress.value = Math.max(0, Math.min(1, e.x / rowW));
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
      if (rowW > 0 && progress) progress.value = Math.max(0, Math.min(1, e.x / rowW));
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
      <View style={[styles.row, { height, gap }]}>
        {bars.map((level, i) => (
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
          <View style={[styles.layer, { width: rowW }]} pointerEvents="none">
            {row(track)}
          </View>
        ) : null}
        {/* A still row is a plain View. Reanimated is for things that move,
            and asking it to hold a constant was exactly how the live row
            ended up invisible on the web. */}
        {width > 0 && !progress ? (
          <View style={[styles.layer, { width: rowW }]} pointerEvents="none">
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
  // `overflow: hidden` is the backstop, not the fix — the arithmetic above
  // keeps the row inside. It is here so that a future change to the bubble's
  // width cannot put bars over the thread again before anyone notices.
  stage: { width: '100%', justifyContent: 'center', overflow: 'hidden' },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  // The gap is computed per render from the width available, and passed in.
  row: { flexDirection: 'row', alignItems: 'center' },
  track: { flex: 1, height: 4, borderRadius: 999 },
});
