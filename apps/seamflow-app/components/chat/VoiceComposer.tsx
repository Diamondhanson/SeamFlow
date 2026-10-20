// ============================================================================
// Recording a voice note — the bar that replaces the composer.
//
// WHY TAP, NOT HOLD
//
// Hold-to-record with slide-to-cancel is the famous gesture, and it is a bad
// one. It fails for anyone whose hands are not steady, it cannot be used while
// walking, it has no discoverable way to pause or reconsider, and the moment
// your finger slips the message is gone with no way to get it back. It is also
// invisible: nothing on screen says the gesture exists.
//
// So: tap to start, and the composer becomes a bar with three plain controls —
// throw it away, stop, send. Nothing is held, nothing is lost by lifting a
// finger, and every control is a labelled target.
//
// AND WHY THERE IS A PREVIEW
//
// Stopping does not send. You get the note back with a play button, and decide.
// That one extra tap is the difference between a feature people use and one
// they are afraid of — most voice notes are re-recorded once, and an app that
// sends the first take the instant you stop talking makes that impossible.
// It is the same two controls in both states, in the same two places: the one
// on the left throws it away, the one on the right moves it forward.
//
// THE MICROPHONE AND THE SPEAKER ARE BEHIND ONE INTERFACE EACH
//
// `useVoiceRecorder` and `useVoicePlayback` are platform-split. Everything
// about how the two platforms differ — expo-audio on native, MediaRecorder and
// Web Audio in the browser — lives there, so this file is only about the bar.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MAX_VOICE_NOTE_MS, VOICE_WAVEFORM_BARS, type MessageAttachment } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { stopAllAudio } from '../../lib/audio-focus';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { usePlaybackProgress } from '../../lib/use-playback-progress';
import { useVoicePlayback } from '../../lib/use-voice-playback';
import { useVoiceRecorder } from '../../lib/use-voice-recorder';
import { PlaybackError } from '../../lib/errors';
import { formatClock, uploadVoiceNote } from '../../lib/voice-note';
import { COMPOSER_CONTROL } from '../../lib/use-composer-keyboard';
import { VoiceWaveform } from './VoiceWaveform';

/**
 * How often we read the level while recording.
 *
 * Twenty a second. The first version sampled whenever the recorder's reported
 * DURATION changed, which on Android moves in whole seconds — so a ten-second
 * note arrived with ten bars, each stretched into a fat lozenge, and the live
 * row lurched once a second instead of moving. The duration is the wrong
 * clock; this is our own, and it drives the clock label too.
 */
const METER_MS = 50;

/** Start counting down out loud with this much left. */
const WARN_MS = 15_000;

const PLAY_UPDATE_MS = 200;

/** Under this, a tap was over before it began and there is nothing to preview. */
const MIN_TAKE_MS = 400;

export function VoiceComposer({
  conversationId,
  onSend,
  onCancel,
  onError,
}: {
  conversationId: string;
  onSend: (attachment: MessageAttachment) => void | Promise<void>;
  onCancel: () => void;
  onError: (err: unknown) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();

  const [phase, setPhase] = useState<'starting' | 'recording' | 'preview' | 'sending'>('starting');

  const recorder = useVoiceRecorder();

  /** Just what the live row draws — the last VOICE_WAVEFORM_BARS samples. */
  const [liveTail, setLiveTail] = useState<number[]>([]);
  /** Measured once when recording stops, for the preview and the upload. */
  const [previewWave, setPreviewWave] = useState<number[]>([]);
  const [uri, setUri] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  /** Guards the two paths into stop(): the button and the two-minute cap. */
  const stopping = useRef(false);
  /** Set when the user throws the note away, so a late stop cannot send it. */
  const abandoned = useRef(false);

  // ── Start ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Anything else playing in the thread would end up in the recording.
        stopAllAudio();
        await recorder.start();
        if (cancelled) {
          recorder.cancel();
          return;
        }
        haptics.commit();
        setPhase('recording');
      } catch (err) {
        if (!cancelled) {
          onError(err);
          onCancel();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once, on mount. The handle is stable for this component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stop → preview ────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    const ms = recorder.durationMs();
    try {
      if (ms < MIN_TAKE_MS) {
        // Nothing worth previewing, and an empty note in the thread would be
        // a mistake nobody could undo.
        recorder.cancel();
        haptics.warning();
        onCancel();
        return;
      }
      const take = await recorder.stop();
      if (abandoned.current) return;
      if (!take) {
        haptics.warning();
        onCancel();
        return;
      }
      setUri(take.uri);
      setBlob(take.blob);
      setRecordedMs(take.durationMs);
      setPreviewWave(take.waveform);
      setPhase('preview');
      haptics.selection();
    } catch (err) {
      onError(err);
      onCancel();
    } finally {
      stopping.current = false;
    }
  }, [recorder, onCancel, onError]);

  // ── The clock and the levels, on one interval ─────────────────────────────
  //
  // `stop` is held in a ref rather than listed as a dependency, and that is
  // the whole reason this works. It is a useCallback over `onCancel` and
  // `onError`, which the thread passes as inline arrows — so it changes
  // identity on every render of the screen. Listed as a dependency it tore
  // this interval down and started a new one each time, and a thread that
  // re-renders faster than the sampling period (one syncing in the background
  // does) never let fifty milliseconds elapse. The timer was restarted
  // forever and almost no levels were ever read, which is why the live row sat
  // flat while the clock counted up beside it.
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (phase !== 'recording') return;
    const tick = setInterval(() => {
      if (!recorder.isRecording()) return;
      const level = recorder.sample();
      setLiveTail((previous) => [...previous, level].slice(-VOICE_WAVEFORM_BARS));
      const ms = recorder.durationMs();
      setElapsedMs(ms);
      if (ms >= MAX_VOICE_NOTE_MS) void stopRef.current();
    }, METER_MS);
    return () => clearInterval(tick);
  }, [phase, recorder]);

  const shownMs = phase === 'recording' ? elapsedMs : recordedMs;
  const remainingMs = MAX_VOICE_NOTE_MS - shownMs;

  // ── Throw it away ─────────────────────────────────────────────────────────
  const discard = useCallback(() => {
    abandoned.current = true;
    haptics.warning();
    recorder.cancel();
    onCancel();
  }, [recorder, onCancel]);

  // ── Preview playback ──────────────────────────────────────────────────────
  //
  // Eager: there is one note and the file is already here, so the length and
  // the first press are both instant. (On the web the recorder has already
  // decoded it to measure the waveform — see lib/web-audio.web.)
  const playback = useVoicePlayback({
    source: uri,
    fallbackDuration: recordedMs / 1000,
    updateMs: PLAY_UPDATE_MS,
    focusId: 'voice-preview',
    eager: !!uri,
  });
  const progress = useSharedValue(0);

  usePlaybackProgress({
    progress,
    currentTime: playback.currentTime,
    total: playback.duration,
    playing: playback.playing,
    scrubbing,
    updateMs: PLAY_UPDATE_MS,
  });

  // A browser that refuses to play is the one failure that used to be silent:
  // the bar said it was playing and nothing came out. Now it says why.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!playback.error || reported.current === playback.error) return;
    reported.current = playback.error;
    onError(new PlaybackError(playback.error));
  }, [playback.error, onError]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendIt = async () => {
    if (!uri) return;
    setPhase('sending');
    try {
      // The decoded clip knows exactly how long it is. Prefer that over the
      // recorder's count, which on Android advances in whole seconds and
      // would describe a 7.8s note as 7s.
      const durationMs =
        playback.duration > 0 ? Math.round(playback.duration * 1000) : recordedMs;
      const attachment = await uploadVoiceNote({
        conversationId,
        uri,
        blob,
        durationMs,
        waveform: previewWave,
      });
      haptics.sent();
      await onSend(attachment);
    } catch (err) {
      onError(err);
      setPhase('preview');
    }
  };

  // ── The pulsing record dot ────────────────────────────────────────────────
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (phase !== 'recording') return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [phase, pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // The live row grows left to right, then scrolls once it is full — the
  // familiar tape. Padding keeps the row the same width throughout, so the
  // controls either side never shift.
  const liveWaveform =
    liveTail.length >= VOICE_WAVEFORM_BARS
      ? liveTail
      : [...liveTail, ...new Array(VOICE_WAVEFORM_BARS - liveTail.length).fill(0)];
  const busy = phase === 'sending';

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.hairline }]}
    >
      <Pressable
        onPress={discard}
        disabled={busy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t('common.delete')}
        style={styles.control}
      >
        <Ionicons name="trash-outline" size={21} color={colors.danger} />
      </Pressable>

      {phase === 'preview' || phase === 'sending' ? (
        <>
          <Pressable
            onPress={() => {
              haptics.selection();
              playback.toggle();
            }}
            disabled={busy}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={playback.playing ? t('common.pause') : t('common.play')}
            style={[styles.playBtn, { backgroundColor: atelier.primary }]}
          >
            {playback.loading ? (
              <ActivityIndicator size="small" color={atelier.textOnPrimary} />
            ) : (
              <Ionicons
                name={playback.playing ? 'pause' : 'play'}
                size={15}
                style={playback.playing ? undefined : styles.playGlyph}
                color={atelier.textOnPrimary}
              />
            )}
          </Pressable>
          <View style={styles.middle}>
            <VoiceWaveform
              waveform={previewWave}
              progress={progress}
              tint={atelier.primary}
              track={colors.border}
              onSeek={(ratio) => playback.seek(ratio * playback.duration)}
              onScrubbingChange={setScrubbing}
            />
          </View>
          <Text variant="caption" tone="textMuted" style={styles.clock}>
            {formatClock(
              playback.playing || playback.currentTime > 0
                ? playback.currentTime * 1000
                : recordedMs,
            )}
          </Text>
        </>
      ) : (
        <>
          <Animated.View style={[styles.dot, { backgroundColor: colors.danger }, dotStyle]} />
          <View style={styles.middle}>
            <VoiceWaveform
              waveform={liveWaveform}
              tint={atelier.primary}
              track={colors.border}
              height={24}
            />
          </View>
          <Text
            variant="caption"
            style={[
              styles.clock,
              // The clock turns into a countdown near the cap, so the recording
              // ending is something you saw coming rather than something that
              // happened to you.
              { color: remainingMs <= WARN_MS ? colors.danger : colors.textMuted },
            ]}
          >
            {remainingMs <= WARN_MS
              ? `−${formatClock(Math.max(0, remainingMs))}`
              : formatClock(shownMs)}
          </Text>
        </>
      )}

      {phase === 'recording' ? (
        <Pressable
          onPress={() => void stop()}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('common.stop')}
          style={[styles.send, { backgroundColor: colors.border }]}
        >
          <Ionicons name="stop" size={16} color={colors.text} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => void sendIt()}
          disabled={busy || !uri}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('common.send')}
          style={[styles.send, { backgroundColor: atelier.primary }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={atelier.textOnPrimary} />
          ) : (
            <Ionicons name="send" size={16} color={atelier.textOnPrimary} />
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: COMPOSER_CONTROL + spacing.sm * 2,
  },
  control: {
    width: COMPOSER_CONTROL,
    height: COMPOSER_CONTROL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  middle: { flex: 1 },
  clock: { minWidth: 38, textAlign: 'right' },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { marginLeft: 2 },
  send: {
    width: COMPOSER_CONTROL,
    height: COMPOSER_CONTROL,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
