// ============================================================================
// Playing a voice note — the web half.
//
// Fetch, decode once, play the samples. No `<audio>` element anywhere, which
// is the point: an element playing a `blob:` URL is the one arrangement iOS
// refuses, and expo-audio's web player never looks at what `play()` returned,
// so a refusal arrives as a UI that says it is playing and no sound. See
// lib/web-audio.web for the quoted details.
//
// Three things fall out of owning it:
//
//   · The gesture is respected. `toggle()` wakes the audio clock in the same
//     turn as the tap and nothing is awaited before it. The old bubble armed
//     its player on press and started it from the effect one render later,
//     which Safari is right to reject.
//   · A failure has a reason. Fetch, decode and start all report, and that
//     string reaches the dialog instead of a shrug.
//   · Your own note plays instantly. The recorder already decoded it to draw
//     the waveform, so the samples are in hand before the tap.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { releaseAudioFocus, takeAudioFocus } from './audio-focus';
import { AudioClip, audioAwake, loadClip, unlockAudio } from './web-audio.web';
import type { VoicePlayback, VoicePlaybackArgs } from './use-voice-playback';

export type { VoicePlayback, VoicePlaybackArgs } from './use-voice-playback';

export function useVoicePlayback(args: VoicePlaybackArgs): VoicePlayback {
  const { source, fallbackDuration, updateMs, focusId, eager = false } = args;

  const clip = useRef<AudioClip | null>(null);
  const loadingNow = useRef(false);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── One clip per source ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const open = clip.current;
      clip.current = null;
      open?.release();
      releaseAudioFocus(focusId);
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [source, focusId]);

  const ended = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
    releaseAudioFocus(focusId);
  }, [focusId]);

  const ensure = useCallback(async (): Promise<AudioClip | null> => {
    if (clip.current) return clip.current;
    if (!source) return null;
    const buffer = await loadClip(source);
    // A second press while the first was still loading — keep the first.
    if (clip.current) return clip.current;
    const made = new AudioClip(buffer, ended);
    clip.current = made;
    setDuration(made.duration);
    return made;
  }, [source, ended]);

  // ── The preview loads without being asked ─────────────────────────────────
  useEffect(() => {
    if (!eager || !source || clip.current) return;
    let dead = false;
    void (async () => {
      try {
        const ready = await ensure();
        if (!dead && ready) setDuration(ready.duration);
      } catch (err) {
        // Not reported here: nothing has been asked for yet, and a dialog
        // nobody triggered is worse than a row that loads on the first press.
        if (!dead) setError((err as Error)?.message ?? null);
      }
    })();
    return () => {
      dead = true;
    };
  }, [eager, source, ensure]);

  const pause = useCallback(() => {
    const open = clip.current;
    if (!open) return;
    open.pause();
    setPlaying(false);
    setCurrentTime(open.currentTime);
  }, []);

  const toggle = useCallback(() => {
    if (!source) return;
    // FIRST, and synchronously. Everything below may await, and the gesture
    // that permits audio is spent the moment anything does.
    unlockAudio();
    setError(null);

    const open = clip.current;
    if (open?.playing) {
      open.pause();
      setPlaying(false);
      setCurrentTime(open.currentTime);
      releaseAudioFocus(focusId);
      return;
    }

    takeAudioFocus(focusId, pause);

    if (open) {
      open.play();
      setPlaying(true);
      return;
    }

    if (loadingNow.current) return;
    loadingNow.current = true;
    setLoading(true);
    void (async () => {
      try {
        const ready = await ensure();
        if (!ready) return;
        ready.play();
        setPlaying(true);
        if (!ready.playing) {
          setError(
            audioAwake()
              ? 'The browser would not start playback'
              : 'This browser blocked audio until the page is tapped',
          );
        }
      } catch (err) {
        setError((err as Error)?.message ?? 'Playback failed');
        releaseAudioFocus(focusId);
      } finally {
        loadingNow.current = false;
        setLoading(false);
      }
    })();
  }, [source, focusId, pause, ensure]);

  // ── The clock ─────────────────────────────────────────────────────────────
  //
  // Polled rather than pushed, because an AudioBufferSourceNode has no
  // progress event — and polled only while something is playing, so an idle
  // thread of twenty notes runs no timers at all. The fill between these
  // samples is interpolated on the UI thread by lib/use-playback-progress.
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => {
      const open = clip.current;
      if (!open) return;
      setCurrentTime(open.currentTime);
      if (!open.playing) setPlaying(false);
    }, updateMs);
    return () => clearInterval(tick);
  }, [playing, updateMs]);

  const seek = useCallback(
    (seconds: number) => {
      unlockAudio();
      const open = clip.current;
      if (open) {
        open.seek(seconds);
        setCurrentTime(open.currentTime);
        setPlaying(open.playing);
        return;
      }
      // Scrubbing before the first press: load, then start from there.
      loadingNow.current = true;
      setLoading(true);
      takeAudioFocus(focusId, pause);
      void (async () => {
        try {
          const ready = await ensure();
          if (!ready) return;
          ready.seek(seconds);
          ready.play();
          setPlaying(true);
          setCurrentTime(ready.currentTime);
        } catch (err) {
          setError((err as Error)?.message ?? 'Playback failed');
        } finally {
          loadingNow.current = false;
          setLoading(false);
        }
      })();
    },
    [ensure, focusId, pause],
  );

  const setRate = useCallback((rate: number) => {
    clip.current?.setRate(rate);
  }, []);

  return {
    loading,
    playing,
    currentTime,
    duration: duration > 0 ? duration : fallbackDuration,
    error,
    toggle,
    seek,
    setRate,
  };
}
