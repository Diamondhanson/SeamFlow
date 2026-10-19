// ============================================================================
// A voice note, in the thread.
//
// THE PLAYER IS NOT CREATED UNTIL IT IS NEEDED
//
// A long thread can hold twenty of these. Giving each one a loaded player on
// mount would mean twenty decoders and twenty network fetches for audio nobody
// has asked to hear. So the source stays null until the first press, and the
// note arms itself then — which is also why there is a `loading` state: the
// first press buys a moment, every press after it is instant.
//
// SMOOTHNESS
//
// The fill is driven by lib/use-playback-progress, which interpolates between
// the player's samples on the UI thread — nothing here re-renders to move it.
// React re-renders five times a second for the clock alone.
//
// Scrubbing takes the value over completely: while a finger is down the sync
// is suspended, so the bar follows the finger rather than fighting it.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSharedValue } from 'react-native-reanimated';
import { Text } from '@seamflow/ui';
import type { MessageAttachment } from '@seamflow/schemas';
import { releaseAudioFocus, takeAudioFocus } from '../../lib/audio-focus';
import { formatClock, localVoiceUri, setAudioSession } from '../../lib/voice-note';
import { usePlaybackProgress } from '../../lib/use-playback-progress';
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

  // The local file, when this is a note we just recorded: it plays instantly
  // off disk while the signed URL is still being issued.
  const source = localVoiceUri(attachment.storagePath) ?? attachment.url ?? null;

  const [armed, setArmed] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [scrubbing, setScrubbing] = useState(false);
  const wantPlay = useRef(false);
  /** Where to jump to once the player finishes loading, if a scrub came first. */
  const pendingSeek = useRef<number | null>(null);

  const player = useAudioPlayer(armed ? source : null, { updateInterval: UPDATE_MS });
  const status = useAudioPlayerStatus(player);

  const progress = useSharedValue(0);
  const id = attachment.storagePath;

  /** Seconds. The recorded length is authoritative until the player loads. */
  const total = status.duration > 0 ? status.duration : attachment.durationMs / 1000;
  const elapsed = status.currentTime;

  // ── Arm, then play ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!armed || !wantPlay.current || !status.isLoaded) return;
    wantPlay.current = false;
    player.play();
  }, [armed, status.isLoaded, player]);

  // ── Keep the fill in step with the audio ──────────────────────────────────
  usePlaybackProgress({
    progress,
    currentTime: elapsed,
    total,
    playing: status.playing,
    scrubbing,
    updateMs: UPDATE_MS,
  });

  // ── Finished ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!status.didJustFinish) return;
    progress.value = 0;
    releaseAudioFocus(id);
    // Back to the start so the same note can be replayed with one press,
    // which is what people do with the half they did not catch.
    void player.seekTo(0);
  }, [status.didJustFinish, player, progress, id]);

  // ── Hand playback back when this bubble goes away ─────────────────────────
  const pause = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Already released by its hook — nothing left to pause.
    }
  }, [player]);

  useEffect(() => () => releaseAudioFocus(id), [id]);

  const toggle = async () => {
    if (!source) return;
    haptics.selection();

    if (status.playing) {
      player.pause();
      releaseAudioFocus(id);
      return;
    }

    // Stop whatever else is going before anything else happens.
    takeAudioFocus(id, pause);
    await setAudioSession('play');

    if (!armed) {
      wantPlay.current = true;
      setArmed(true);
      return;
    }
    player.play();
  };

  const seek = (ratio: number) => {
    if (total <= 0) return;
    const to = Math.max(0, Math.min(total, ratio * total));
    if (!armed) {
      // Seeking before the first play: remember where, and start there.
      wantPlay.current = true;
      takeAudioFocus(id, pause);
      setArmed(true);
      pendingSeek.current = to;
      return;
    }
    void player.seekTo(to);
  };

  useEffect(() => {
    if (pendingSeek.current == null || !status.isLoaded) return;
    const to = pendingSeek.current;
    pendingSeek.current = null;
    void player.seekTo(to);
  }, [status.isLoaded, player]);

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length]!;
    setRate(next);
    haptics.selection();
    if (armed) player.setPlaybackRate(next, 'high');
  };

  const loading = armed && !status.isLoaded;
  // Before the first press the label is the length of the note; after it, how
  // far in you are. Both are the same shape, so the row never reflows.
  const clock = formatClock((armed && elapsed > 0 ? elapsed : total) * 1000);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => void toggle()}
        disabled={!source}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? t('common.pause') : t('common.play')}
        style={[
          styles.play,
          {
            backgroundColor: mine ? tint : colors.bg,
            opacity: source ? 1 : 0.5,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={glyph} />
        ) : (
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={16}
            // The glyph is drawn off-centre by its own bearing; nudging the
            // play triangle a pixel right is what makes it look centred.
            style={status.playing ? undefined : styles.playGlyph}
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
          onSeek={source ? seek : undefined}
          onScrubbingChange={setScrubbing}
        />
        <View style={styles.meta}>
          <Text variant="caption" style={{ color: textColor, opacity: 0.75 }}>
            {clock}
          </Text>
          {/* The speed control only appears once this note is in play: before
              that it is a setting for something nobody has heard yet. */}
          {armed ? (
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
