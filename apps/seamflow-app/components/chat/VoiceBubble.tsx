// ============================================================================
// A voice note, in the thread.
//
// Everything about HOW it plays is in lib/use-voice-playback — one interface,
// expo-audio behind it on native and Web Audio behind it in the browser. This
// file is the row: a play button, a waveform you can scrub, a clock, and a
// speed pill.
//
// THE NOTE IS NOT LOADED UNTIL IT IS NEEDED
//
// A long thread can hold twenty of these, and loading them all would mean
// twenty decoders and twenty network fetches for audio nobody has asked to
// hear. The hook holds the laziness, which is why there is a `loading` state:
// the first press buys a moment, every press after it is instant.
//
// PRESSING PLAY PLAYS. THAT IS NOT A GIVEN.
//
// The previous version armed a player on press and started it from the effect
// that followed, one React render later. Browsers grant audio to the GESTURE,
// and a render is already outside it, so Safari refused — and expo-audio's web
// player never looks at what `play()` returned, so the row showed a pause icon
// and no sound came out. `toggle()` is now called straight from the press and
// does its unlocking before it awaits anything.
//
// SMOOTHNESS
//
// The fill is driven by lib/use-playback-progress, which interpolates between
// the player's samples on the UI thread — nothing here re-renders to move it.
// React re-renders five times a second for the clock alone. Scrubbing takes
// the value over completely: while a finger is down the sync is suspended, so
// the bar follows the finger rather than fighting it.
// ============================================================================

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { Text } from '@seamflow/ui';
import type { MessageAttachment } from '@seamflow/schemas';
import { formatClock, localVoiceUri } from '../../lib/voice-note';
import { usePlaybackProgress } from '../../lib/use-playback-progress';
import { useVoicePlayback } from '../../lib/use-voice-playback';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { VoiceWaveform } from './VoiceWaveform';

type Voice = Extract<MessageAttachment, { kind: 'voice' }>;

/** How often the player reports in. Interpolated between, so this is not the
 *  frame rate of the fill — only of the clock. */
const UPDATE_MS = 200;

/** 1× is where everyone starts; the rest is for a note that rambles. */
const RATES = [1, 1.5, 2] as const;

export function VoiceBubble({
  attachment,
  mine,
  tint,
  track,
  textColor,
  glyph,
}: {
  attachment: Voice;
  /** Mine sits on the accent bubble, theirs on the card — different contrast. */
  mine: boolean;
  tint: string;
  track: string;
  textColor: string;
  /**
   * The play triangle itself.
   *
   * Passed in rather than derived, because the obvious derivation is wrong in
   * dark mode: there, `textOnPrimary` and the page background are the SAME
   * near-black, so a disc of one carrying a glyph of the other is a black
   * circle with nothing in it. Which is exactly what shipped.
   */
  glyph: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // The local copy, when this is a note we just recorded: it plays instantly
  // while the signed URL is still being issued. On the web it is also the URL
  // the recorder cached its decoded samples under, so there is nothing left to
  // fetch or decode at all.
  const source = localVoiceUri(attachment.storagePath) ?? attachment.url ?? null;

  const [rate, setRate] = useState<number>(1);
  const [scrubbing, setScrubbing] = useState(false);

  const playback = useVoicePlayback({
    source,
    fallbackDuration: attachment.durationMs / 1000,
    updateMs: UPDATE_MS,
    focusId: attachment.storagePath,
  });

  const progress = useSharedValue(0);

  usePlaybackProgress({
    progress,
    currentTime: playback.currentTime,
    total: playback.duration,
    playing: playback.playing,
    scrubbing,
    updateMs: UPDATE_MS,
  });

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length]!;
    setRate(next);
    haptics.selection();
    playback.setRate(next);
  };

  // Before the first press the label is the length of the note; after it, how
  // far in you are. Both are the same shape, so the row never reflows.
  const started = playback.playing || playback.currentTime > 0;
  const clock = formatClock((started ? playback.currentTime : playback.duration) * 1000);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          haptics.selection();
          playback.toggle();
        }}
        disabled={!source}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={playback.playing ? t('common.pause') : t('common.play')}
        style={[
          styles.play,
          {
            backgroundColor: mine ? tint : colors.bg,
            opacity: source ? 1 : 0.5,
          },
        ]}
      >
        {playback.loading ? (
          <ActivityIndicator size="small" color={glyph} />
        ) : (
          <Ionicons
            name={playback.playing ? 'pause' : 'play'}
            size={16}
            // The glyph is drawn off-centre by its own bearing; nudging the
            // play triangle a pixel right is what makes it look centred.
            style={playback.playing ? undefined : styles.playGlyph}
            color={glyph}
          />
        )}
      </Pressable>

      <View style={styles.middle}>
        <VoiceWaveform
          waveform={attachment.waveform}
          progress={progress}
          tint={tint}
          track={track}
          onSeek={source ? (ratio) => playback.seek(ratio * playback.duration) : undefined}
          onScrubbingChange={setScrubbing}
        />
        <View style={styles.meta}>
          <Text variant="caption" style={{ color: textColor, opacity: 0.75 }}>
            {clock}
          </Text>
          {/* The speed control only appears once this note is in play: before
              that it is a setting for something nobody has heard yet. */}
          {started ? (
            <Pressable
              onPress={cycleRate}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.playbackSpeed')}
              style={[styles.rate, { borderColor: textColor }]}
            >
              <Text variant="caption" style={{ color: textColor, opacity: 0.75 }}>
                {`${rate}×`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 190 },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { marginLeft: 2 },
  middle: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rate: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.75,
  },
});
