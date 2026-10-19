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
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
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
import {
  VOICE_RECORDING_OPTIONS,
  ensureMicPermission,
  formatClock,
  meterToLevel,
  resampleWaveform,
  setAudioSession,
  uploadVoiceNote,
} from '../../lib/voice-note';
import { COMPOSER_CONTROL } from '../../lib/use-composer-keyboard';
import { VoiceWaveform } from './VoiceWaveform';

/** How often we read the level while recording. Ten a second draws a waveform
 *  that looks like speech; much slower and it looks like a bar chart. */
const METER_MS = 100;

/** Start counting down out loud with this much left. */
const WARN_MS = 15_000;

const PLAY_UPDATE_MS = 200;

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

  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  // Polled ten times a second only while it matters. Once the note is
  // recorded there is nothing left to meter, and a recorder still reporting in
  // would re-render the preview underneath the person listening to it.
  const recState = useAudioRecorderState(recorder, phase === 'recording' ? METER_MS : 1000);
  const [levels, setLevels] = useState<number[]>([]);
  const [uri, setUri] = useState<string | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
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
        await ensureMicPermission();
        await setAudioSession('record');
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
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
    // Once, on mount. The recorder instance is stable for this component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stop → preview ────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    const ms = recState.durationMillis;
    try {
      await recorder.stop();
      await setAudioSession('play');
      if (abandoned.current) return;
      const recordedUri = recorder.uri;
      if (!recordedUri || ms < 400) {
        // A tap that was over before it began. Nothing worth previewing, and
        // an empty note in the thread would be a mistake nobody could undo.
        haptics.warning();
        onCancel();
        return;
      }
      setUri(recordedUri);
      setRecordedMs(ms);
      setPhase('preview');
      haptics.selection();
    } catch (err) {
      onError(err);
      onCancel();
    } finally {
      stopping.current = false;
    }
  }, [recorder, recState.durationMillis, onCancel, onError]);

  // ── Collect levels, and stop at the cap ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording' || !recState.isRecording) return;
    setLevels((prev) => [...prev, meterToLevel(recState.metering)]);
    if (recState.durationMillis >= MAX_VOICE_NOTE_MS) void stop();
    // durationMillis ticks on every poll, which is what drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.durationMillis, phase]);

  const elapsedMs = phase === 'recording' ? recState.durationMillis : recordedMs;
  const remainingMs = MAX_VOICE_NOTE_MS - elapsedMs;

  // ── Throw it away ─────────────────────────────────────────────────────────
  const discard = useCallback(async () => {
    abandoned.current = true;
    haptics.warning();
    try {
      if (recState.isRecording) await recorder.stop();
    } catch {
      // Already stopped, or never started. Either way it is going.
    }
    onCancel();
  }, [recorder, recState.isRecording, onCancel]);

  // Leaving the screen mid-recording must not leave the mic open.
  useEffect(
    () => () => {
      abandoned.current = true;
      try {
        if (recorder.isRecording) void recorder.stop();
      } catch {
        // Nothing to unwind.
      }
    },
    [recorder],
  );

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendIt = async () => {
    if (!uri) return;
    setPhase('sending');
    try {
      const attachment = await uploadVoiceNote({
        conversationId,
        uri,
        durationMs: recordedMs,
        waveform: resampleWaveform(levels),
      });
      haptics.sent();
      await onSend(attachment);
    } catch (err) {
      onError(err);
      setPhase('preview');
    }
  };

  // ── Preview playback ──────────────────────────────────────────────────────
  const player = useAudioPlayer(uri, { updateInterval: PLAY_UPDATE_MS });
  const playStatus = useAudioPlayerStatus(player);
  const progress = useSharedValue(0);
  const totalS = recordedMs / 1000;

  usePlaybackProgress({
    progress,
    currentTime: playStatus.currentTime,
    total: playStatus.duration > 0 ? playStatus.duration : totalS,
    playing: playStatus.playing,
    scrubbing,
    updateMs: PLAY_UPDATE_MS,
  });

  useEffect(() => {
    if (!playStatus.didJustFinish) return;
    progress.value = 0;
    void player.seekTo(0);
  }, [playStatus.didJustFinish, player, progress]);

  // ── The pulsing record dot ────────────────────────────────────────────────
  /** The live row has nothing to seek through, so it is drawn entirely in the
   *  accent — a progress fill of zero would render it as a dead grey bar. */
  const live = useSharedValue(1);

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
  const liveWaveform = (() => {
    const tail = levels.slice(-VOICE_WAVEFORM_BARS);
    if (tail.length >= VOICE_WAVEFORM_BARS) return tail;
    return [...tail, ...new Array(VOICE_WAVEFORM_BARS - tail.length).fill(0)];
  })();

  const previewWaveform = resampleWaveform(levels);
  const busy = phase === 'sending';

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.hairline }]}
    >
      <Pressable
        onPress={() => void discard()}
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
              if (playStatus.playing) player.pause();
              else player.play();
            }}
            disabled={busy}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={playStatus.playing ? t('common.pause') : t('common.play')}
            style={[styles.playBtn, { backgroundColor: atelier.primary }]}
          >
            <Ionicons
              name={playStatus.playing ? 'pause' : 'play'}
              size={15}
              style={playStatus.playing ? undefined : styles.playGlyph}
              color={atelier.textOnPrimary}
            />
          </Pressable>
          <View style={styles.middle}>
            <VoiceWaveform
              waveform={previewWaveform}
              progress={progress}
              tint={atelier.primary}
              track={colors.border}
              onSeek={(ratio) => void player.seekTo(ratio * totalS)}
              onScrubbingChange={setScrubbing}
            />
          </View>
          <Text variant="caption" tone="textMuted" style={styles.clock}>
            {formatClock(playStatus.playing ? playStatus.currentTime * 1000 : recordedMs)}
          </Text>
        </>
      ) : (
        <>
          <Animated.View
            style={[styles.dot, { backgroundColor: colors.danger }, dotStyle]}
          />
          <View style={styles.middle}>
            <VoiceWaveform
              waveform={liveWaveform}
              progress={live}
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
              : formatClock(elapsedMs)}
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
