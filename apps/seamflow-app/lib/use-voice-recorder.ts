// ============================================================================
// Recording a voice note — the native half.
//
// A thin, imperative handle over expo-audio, which on iOS and Android does the
// right thing: it meters the microphone itself while recording, so the levels
// are already in hand by the time it stops.
//
// Imperative rather than reactive on purpose. The composer samples on its own
// 50 ms interval (see METER_MS there) and an interval whose lifetime depends on
// a changing hook result is an interval that gets torn down and restarted
// before it ever fires. That bug cost a release; the handle this returns is
// stable for the life of the component.
//
// The web half — lib/use-voice-recorder.web — implements the same interface
// over MediaRecorder and our own analyser, because expo-audio's web recorder
// cannot meter and record at the same time. See lib/web-audio.web.
// ============================================================================

import { useEffect, useMemo, useRef } from 'react';
import { useAudioRecorder } from 'expo-audio';
import {
  VOICE_RECORDING_OPTIONS,
  ensureMicPermission,
  setAudioSession,
  waitForRecording,
  type VoiceRecorder,
  type VoiceTake,
} from './voice-note';
import { meterToLevel, resampleWaveform } from './waveform';

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const levels = useRef<number[]>([]);

  // Leaving the screen mid-recording must not leave the microphone open.
  useEffect(
    () => () => {
      try {
        if (recorder.isRecording) void recorder.stop();
      } catch {
        // Already stopped, or never started.
      }
    },
    [recorder],
  );

  return useMemo<VoiceRecorder>(
    () => ({
      async start() {
        levels.current = [];
        await ensureMicPermission();
        await setAudioSession('record');
        await recorder.prepareToRecordAsync();
        recorder.record();
      },

      isRecording() {
        return recorder.isRecording;
      },

      durationMs() {
        return recorder.getStatus().durationMillis;
      },

      sample() {
        const status = recorder.getStatus();
        if (!status.isRecording) return 0;
        const level = meterToLevel(status.metering);
        levels.current.push(level);
        return level;
      },

      async stop(): Promise<VoiceTake | null> {
        // Read the duration from the recorder, not from a polled copy of it,
        // which can be a quarter of a second behind by the time Stop is hit.
        const durationMs = recorder.getStatus().durationMillis;
        await recorder.stop();
        await setAudioSession('play');
        const uri = recorder.uri;
        if (!uri) return null;
        // The encoder is still finishing the file — see waitForRecording.
        await waitForRecording(uri);
        return {
          uri,
          blob: null,
          durationMs,
          waveform: resampleWaveform(levels.current),
        };
      },

      cancel() {
        try {
          if (recorder.isRecording) void recorder.stop();
        } catch {
          // Already stopped. Either way it is going.
        }
      },
    }),
    [recorder],
  );
}
