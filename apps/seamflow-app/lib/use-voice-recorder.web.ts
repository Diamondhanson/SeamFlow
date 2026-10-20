// ============================================================================
// Recording a voice note — the web half, which we drive ourselves.
//
// MediaRecorder for the bytes, our own AnalyserNode for the levels, on the one
// AudioContext the app owns. The reasons not to use expo-audio's web recorder
// are in lib/web-audio.web, at length; the short version is that its meter
// hangs an analyser off a graph with no destination and wakes the context from
// somewhere that is not a user gesture, so in Safari it reads silence.
//
// Here the analyser is wired mic → analyser → silent gain → destination. The
// gain is zero, so nothing is audible and no feedback loop is possible, but the
// node is on a path to the destination, which is what makes every engine
// actually render it. That is the whole of the fix for the flat row.
//
// And the bytes never become a `blob:` URL we have to read back: `stop()`
// hands over the Blob itself, which goes straight to the upload.
// ============================================================================

import { useEffect, useMemo, useRef } from 'react';
import { VOICE_WAVEFORM_BARS } from '@seamflow/schemas';
import { UploadError } from './errors';
import { PermissionDeniedError } from './permissions';
import { meterToLevel, resampleWaveform } from './waveform';
import {
  audioContext,
  cacheDecoded,
  decodeAudio,
  peaksFromBuffer,
  unlockAudio,
} from './web-audio.web';
import type { VoiceRecorder, VoiceTake } from './voice-note';

/**
 * In order of preference, and all of them MP4/AAC on purpose.
 *
 * Chrome's default is WebM/Opus, which no iPhone can play. Rather than ship a
 * note that is silently unplayable for half its recipients, recording is
 * offered on the web only where one of these works — `canRecordVoice()` in
 * lib/voice-note asks the same question before the mic button is drawn.
 */
const MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
] as const;

export function pickRecordingMimeType(): string | null {
  const MR = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!MR?.isTypeSupported) return null;
  for (const candidate of MIME_CANDIDATES) {
    if (MR.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  silent: GainNode;
  frame: Float32Array<ArrayBuffer>;
  chunks: Blob[];
  mime: string;
  startedAt: number;
  levels: number[];
}

/** Hang up the microphone and take the graph apart. Safe to call twice. */
function teardown(session: Session): void {
  try {
    if (session.recorder.state !== 'inactive') session.recorder.stop();
  } catch {
    // Already inactive.
  }
  for (const node of [session.source, session.analyser, session.silent]) {
    try {
      node.disconnect();
    } catch {
      // Already disconnected.
    }
  }
  // Without this the browser keeps showing a recording indicator.
  session.stream.getTracks().forEach((track) => track.stop());
}

async function begin(): Promise<Session> {
  const mime = pickRecordingMimeType();
  if (!mime) throw new UploadError('This browser cannot record MP4 audio', 'voice');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    const name = (err as Error)?.name;
    // A refusal the browser will ask about again (dismissed) versus one it has
    // remembered (blocked). The caller offers Settings for the second.
    throw new PermissionDeniedError('microphone', name === 'NotAllowedError' ? false : true);
  }

  // The context should already be awake — ChatThread unlocks it in the tap on
  // the mic button. Asking again is free and covers the case where the
  // composer was reached some other way.
  unlockAudio();
  const ctx = audioContext();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  // 1024 is ~23 ms at 44.1 kHz: long enough for a stable RMS, short enough
  // that a syllable still registers as a syllable.
  analyser.fftSize = 1024;
  const silent = ctx.createGain();
  silent.gain.value = 0;
  source.connect(analyser);
  analyser.connect(silent);
  silent.connect(ctx.destination);

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  // No timeslice: one `dataavailable` at the end, so what we assemble is the
  // single complete file the encoder wrote rather than a pile of fragments.
  recorder.start();

  return {
    stream,
    recorder,
    source,
    analyser,
    silent,
    frame: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)),
    chunks,
    mime,
    startedAt: Date.now(),
    levels: [],
  };
}

/** The current level as a 0–100 bar height, on the same curve as native. */
function levelOf(session: Session): number {
  session.analyser.getFloatTimeDomainData(session.frame);
  let sumSquares = 0;
  for (let i = 0; i < session.frame.length; i++) {
    const v = session.frame[i]!;
    sumSquares += v * v;
  }
  const rms = Math.sqrt(sumSquares / session.frame.length);
  if (rms <= 0) return 0;
  // 20·log10(rms) is exactly what the native meter reports, so meterToLevel
  // maps both platforms through the same floor and the same curve and the two
  // look like the same feature.
  return meterToLevel(20 * Math.log10(rms));
}

async function end(session: Session): Promise<VoiceTake | null> {
  const wallClockMs = Date.now() - session.startedAt;

  const collected = () => new Blob(session.chunks, { type: session.mime });

  // `stop` fires after the final `dataavailable`, so when it arrives every
  // chunk is in hand. The timeout is a belt: if a browser ever skipped the
  // event we would rather send what we have than hang on the preview screen.
  const assembled = new Promise<Blob>((resolve) => {
    session.recorder.onstop = () => resolve(collected());
    if (session.recorder.state === 'inactive') {
      resolve(collected());
      return;
    }
    try {
      session.recorder.stop();
    } catch {
      resolve(collected());
    }
  });

  const blob = await Promise.race([
    assembled,
    new Promise<Blob>((resolve) => setTimeout(() => resolve(collected()), 2_000)),
  ]);

  teardown(session);

  if (blob.size === 0) throw new UploadError('The browser recorded nothing', 'voice');

  const uri = URL.createObjectURL(blob);

  // Measure the shape and the exact length from the audio itself. The live
  // levels are a fallback, not the answer: they are twenty samples a second
  // and a guess at what fell between them, while this reads every sample.
  let waveform = resampleWaveform(session.levels);
  let durationMs = wallClockMs;
  try {
    const decodedClip = await decodeAudio(await blob.arrayBuffer());
    // Keep it: the preview and your own bubble both play this URL, and with
    // the samples already here playback starts in the same frame as the tap.
    cacheDecoded(uri, decodedClip);
    const peaks = peaksFromBuffer(decodedClip, VOICE_WAVEFORM_BARS);
    if (peaks.some((p) => p > 0)) waveform = peaks;
    if (decodedClip.duration > 0) durationMs = Math.round(decodedClip.duration * 1000);
  } catch {
    // Undecodable here does not mean unplayable there — the file still sends,
    // drawn with whatever the meter saw.
  }

  return { uri, blob, durationMs, waveform };
}

export function useVoiceRecorder(): VoiceRecorder {
  const session = useRef<Session | null>(null);

  useEffect(
    () => () => {
      const open = session.current;
      session.current = null;
      if (open) teardown(open);
    },
    [],
  );

  return useMemo<VoiceRecorder>(
    () => ({
      async start() {
        session.current = await begin();
      },

      isRecording() {
        return session.current?.recorder.state === 'recording';
      },

      durationMs() {
        return session.current ? Date.now() - session.current.startedAt : 0;
      },

      sample() {
        const open = session.current;
        if (!open || open.recorder.state !== 'recording') return 0;
        const level = levelOf(open);
        open.levels.push(level);
        return level;
      },

      async stop(): Promise<VoiceTake | null> {
        const open = session.current;
        session.current = null;
        return open ? await end(open) : null;
      },

      cancel() {
        const open = session.current;
        session.current = null;
        if (open) teardown(open);
      },
    }),
    [],
  );
}
