// ============================================================================
// Playing a voice note — the native half.
//
// expo-audio over its own players, with two pieces of behaviour that belong
// here rather than in each component that plays something:
//
// LAZY. A thread can hold twenty notes. Giving each one a loaded player on
// mount means twenty decoders and twenty network fetches for audio nobody has
// asked to hear, so the source stays null until the first press. `eager` is
// for the recorder's preview, which has exactly one note and already has the
// file on disk.
//
// ONE AT A TIME. Starting anything stops whatever was running, through
// lib/audio-focus. Two voice notes at once is not a minor annoyance; it is
// unintelligible, and the fastest way to make someone distrust the feature.
//
// The web half — lib/use-voice-playback.web — implements the same interface
// over Web Audio, for the reasons in lib/web-audio.web.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { releaseAudioFocus, takeAudioFocus } from './audio-focus';
import { setAudioSession } from './voice-note';

export interface VoicePlayback {
  /** The clip is being fetched or decoded. Show a spinner. */
  loading: boolean;
  playing: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds. The recorded length until the clip reports its own. */
  duration: number;
  /** Why playback could not start, if it could not. Already human-readable. */
  error: string | null;
  /** MUST be called synchronously from a tap — browsers require the gesture. */
  toggle: () => void;
  seek: (seconds: number) => void;
  setRate: (rate: number) => void;
}

export interface VoicePlaybackArgs {
  source: string | null;
  /** Seconds, from the message itself, so the row is drawn before it loads. */
  fallbackDuration: number;
  updateMs: number;
  /** Who holds playback. One per note — the storage path does nicely. */
  focusId: string;
  /** Load without waiting for a press. For the preview, not for the thread. */
  eager?: boolean;
}

export function useVoicePlayback(args: VoicePlaybackArgs): VoicePlayback {
  const { source, fallbackDuration, updateMs, focusId, eager = false } = args;

  const [armed, setArmed] = useState(eager);
  const wantPlay = useRef(false);
  /** Where to jump to once the player loads, if a scrub came before a press. */
  const pendingSeek = useRef<number | null>(null);

  const player = useAudioPlayer(armed ? source : null, { updateInterval: updateMs });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (eager) setArmed(true);
  }, [eager]);

  const pause = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Already released by its hook — nothing left to pause.
    }
  }, [player]);

  // ── Arm, then play ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!armed || !wantPlay.current || !status.isLoaded) return;
    wantPlay.current = false;
    player.play();
  }, [armed, status.isLoaded, player]);

  useEffect(() => {
    if (pendingSeek.current == null || !status.isLoaded) return;
    const to = pendingSeek.current;
    pendingSeek.current = null;
    void player.seekTo(to);
  }, [status.isLoaded, player]);

  // ── Finished ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!status.didJustFinish) return;
    releaseAudioFocus(focusId);
    // Back to the start, so the same note replays with one press.
    void player.seekTo(0);
  }, [status.didJustFinish, player, focusId]);

  useEffect(() => () => releaseAudioFocus(focusId), [focusId]);

  const toggle = useCallback(() => {
    if (!source) return;
    if (status.playing) {
      player.pause();
      releaseAudioFocus(focusId);
      return;
    }
    takeAudioFocus(focusId, pause);
    void setAudioSession('play');
    if (!armed) {
      wantPlay.current = true;
      setArmed(true);
      return;
    }
    player.play();
  }, [source, status.playing, player, focusId, pause, armed]);

  const duration = status.duration > 0 ? status.duration : fallbackDuration;

  const seek = useCallback(
    (seconds: number) => {
      const to = Math.max(0, Math.min(duration, seconds));
      if (!armed) {
        // Scrubbing before the first play: remember where, and start there.
        wantPlay.current = true;
        takeAudioFocus(focusId, pause);
        setArmed(true);
        pendingSeek.current = to;
        return;
      }
      void player.seekTo(to);
    },
    [armed, duration, player, focusId, pause],
  );

  const setRate = useCallback(
    (rate: number) => {
      if (armed) player.setPlaybackRate(rate, 'high');
    },
    [armed, player],
  );

  return {
    loading: armed && !status.isLoaded,
    playing: status.playing,
    currentTime: status.didJustFinish ? 0 : status.currentTime,
    duration,
    // Native tells us nothing useful when a file will not open, and it has
    // never been the platform that failed. The web half fills this in.
    error: null,
    toggle,
    seek,
    setRate,
  };
}
