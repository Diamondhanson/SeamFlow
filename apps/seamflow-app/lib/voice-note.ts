// ============================================================================
// Voice notes — recording format, capture helpers, and the upload.
//
// WHY A CUSTOM RECORDING PRESET
//
// Neither preset expo-audio ships is right for speech in a chat.
// `HIGH_QUALITY` is 128 kbps stereo: a thirty-second remark becomes half a
// megabyte for no audible gain, because the thing being recorded is one person
// talking into a phone held at arm's length. `LOW_QUALITY` is worse in a way
// that matters more — on Android it switches to AMR-NB in a .3gp container,
// so the same feature would produce two different file types depending on
// which phone sent it, and the iPhone at the other end would be handed
// something it cannot play.
//
// So: mono AAC in .m4a on both platforms, 32 kbps, 32 kHz. That is ~4 KB per
// second — a two-minute note is under half a megabyte, less than one of the
// photos already in the thread — and .m4a is the one container both phones
// record natively AND every browser plays.
//
// ON THE WEB
//
// Browsers record whatever MediaRecorder gives them, and Chrome's default is
// WebM/Opus — which an iPhone cannot play. Rather than ship a note that is
// silently unplayable for half its recipients, recording is offered on the web
// only when the browser can produce MP4; otherwise the mic is hidden and the
// composer is text and photos, exactly as before. PLAYBACK is unaffected:
// every browser plays the AAC that phones produce.
//
// The web does not use expo-audio to record or to play. It drives
// MediaRecorder and Web Audio directly — lib/use-voice-recorder.web,
// lib/use-voice-playback.web and lib/web-audio.web, where the three bugs in
// expo-audio's web layer that forced it are quoted from its source. The
// options below are read on native only.
// ============================================================================

import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type RecordingOptions,
} from 'expo-audio';
import type { MessageAttachment } from '@seamflow/schemas';
import { supabase } from './supabase';
import { UploadError } from './errors';
import { PermissionDeniedError } from './permissions';
import { resampleWaveform } from './waveform';

// Re-exported so callers have one import for "voice notes" and do not have to
// know which half of it touches hardware.
export { formatClock, meterToLevel, resampleWaveform } from './waveform';

/** Private. Chat attachments, readable only by the two participants. */
const CHAT_BUCKET = 'chat-media';

/** What the bucket is told the file is, and what the row records. */
const NATIVE_CONTENT_TYPE = 'audio/mp4';
const WEB_CONTENT_TYPE = 'audio/mp4';

export const VOICE_RECORDING_OPTIONS = {
  extension: '.m4a',
  // 32 kHz rather than 44.1: speech carries nothing above ~8 kHz, and the
  // lower rate is a straight third off the file for no audible difference.
  sampleRate: 32000,
  numberOfChannels: 1,
  bitRate: 32000,
  // These options are read on native only. The web never reaches expo-audio's
  // recorder at all — lib/use-voice-recorder.web drives MediaRecorder itself,
  // because expo-audio's web meter is wired to a graph with no destination and
  // reads silence in Safari. See lib/web-audio.web for the whole account.
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    // 'aac ' — the trailing space is part of the four-character code.
    outputFormat: 'aac ',
    // 64 on expo-audio's 0–127 scale. MAX would spend bits on room noise.
    audioQuality: 64,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: WEB_CONTENT_TYPE, bitsPerSecond: 32000 },
  // `mimeType` AGAIN, at the top level, and not by mistake.
  //
  // expo-audio's web recorder reads `options.mimeType`, not `options.web
  // .mimeType` (AudioRecorder.web.js), so the nested block alone is ignored
  // and it falls back to its own default — `audio/webm`. That would be the
  // exact failure this module exists to avoid: a note recorded in a browser,
  // labelled .m4a because that is what we named it, and silent on every
  // iPhone it reached. The nested copy stays for the day they fix it.
  mimeType: WEB_CONTENT_TYPE,
} as RecordingOptions;

// ── What a recording is, once it is finished ────────────────────────────────

/**
 * A finished take, from either platform.
 *
 * `blob` is the web's doing and the reason the upload needs no second read:
 * MediaRecorder hands over the bytes, so they go straight to storage. Native
 * has a file on disk instead and leaves this null.
 */
export interface VoiceTake {
  /** Playable here and now: a `file://` path, or a `blob:` URL on the web. */
  uri: string;
  blob: Blob | null;
  durationMs: number;
  /** Already resampled to VOICE_WAVEFORM_BARS. */
  waveform: number[];
}

/**
 * The recorder, as both platforms present it.
 *
 * Deliberately imperative and deliberately stable for the life of the
 * component. The composer samples on its own 50 ms interval, and an interval
 * whose dependencies change on every render is an interval that is torn down
 * before it ever fires — which is exactly how a release shipped with a live
 * waveform that sat flat while the clock counted up beside it.
 */
export interface VoiceRecorder {
  /** Permission, audio session, microphone, and start. */
  start(): Promise<void>;
  isRecording(): boolean;
  durationMs(): number;
  /** Read the level now, remember it, and return it as a 0–100 bar height. */
  sample(): number;
  /** Stop, and hand back something playable and sendable. Null if nothing. */
  stop(): Promise<VoiceTake | null>;
  /** Throw it away and hang up the microphone. */
  cancel(): void;
}

/**
 * Can this device record something the other side will be able to play?
 *
 * Native: always. Web: only where MediaRecorder can produce MP4 — see the
 * header. Checked rather than assumed, because the answer differs between two
 * versions of the same browser.
 */
export function canRecordVoice(): boolean {
  if (Platform.OS !== 'web') return true;
  const w = globalThis as {
    MediaRecorder?: { isTypeSupported?: (t: string) => boolean };
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  // Web Audio as well as MediaRecorder: the level meter and playback both run
  // on it, so a browser without it would record a note it could not draw or
  // play back. Nothing currently ships MediaRecorder without it; the check
  // costs nothing and keeps the mic button honest.
  if (!w.AudioContext && !w.webkitAudioContext) return false;
  const MR = w.MediaRecorder;
  if (!MR?.isTypeSupported) return false;
  // Must match MIME_CANDIDATES in lib/use-voice-recorder.web — this question
  // and that list are the same question asked in two places.
  return ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'].some((t) =>
    MR.isTypeSupported!(t),
  );
}

/**
 * Ask for the microphone, once, at the moment it is first needed.
 *
 * Throws `PermissionDeniedError` carrying `canAskAgain` so the caller can
 * offer Settings — iOS never re-prompts after the first refusal, and a mic
 * button that silently does nothing is the worst of both.
 */
export async function ensureMicPermission(): Promise<void> {
  const perm = await requestRecordingPermissionsAsync();
  if (!perm.granted) {
    throw new PermissionDeniedError('microphone', perm.canAskAgain ?? false);
  }
}

/**
 * Point the audio session at the right thing.
 *
 * `playsInSilentMode` is the one people notice: without it a voice note is
 * silent on an iPhone whose ringer switch is flipped, which every user reads
 * as a broken message rather than a muted phone.
 *
 * Recording and playback need different sessions on iOS, so this is called on
 * each transition rather than once at startup.
 */
export async function setAudioSession(mode: 'record' | 'play'): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: mode === 'record',
      playsInSilentMode: true,
      // A voice note is not background media: it should stop when the app does
      // rather than keep a media session alive behind other apps.
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    // A session we could not configure still records and plays on most
    // devices; failing the whole interaction over it would be worse.
  }
}

// ── Waiting for the encoder to finish ───────────────────────────────────────

/**
 * Block until the recording on disk is actually complete.
 *
 * `recorder.stop()` resolving does not mean the file is finished. On Android
 * the muxer still has to write the moov atom that tells a player where
 * everything is, and for a short window the file on disk is either empty or
 * truncated — which produced the two symptoms that looked unrelated: the
 * preview refused to play (no moov, nothing to decode) and sending failed
 * (zero bytes read, so the upload refused the empty file).
 *
 * So: poll the size until it stops changing. Two identical non-zero readings
 * in a row means the writer has let go. A couple of hundred milliseconds in
 * practice, and the preview screen is appearing in that time anyway.
 *
 * Web needs none of this — MediaRecorder hands over a Blob that is complete by
 * definition — so it returns immediately.
 */
export async function waitForRecording(uri: string, timeoutMs = 3_000): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const deadline = Date.now() + timeoutMs;
  let previous = -1;
  let stable = 0;
  while (Date.now() < deadline) {
    let size = 0;
    try {
      size = new File(uri).size;
    } catch {
      size = 0;
    }
    if (size > 0 && size === previous) {
      stable += 1;
      if (stable >= 2) return size;
    } else {
      stable = 0;
    }
    previous = size;
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  throw new UploadError('The recording did not finish writing', 'voice');
}

// ── The local copy ──────────────────────────────────────────────────────────

/**
 * Where a just-recorded note still sits on this device, keyed by the path it
 * was uploaded to.
 *
 * The point is the gap between sending and the server handing back a signed
 * URL: without this, a note you just recorded is unplayable for a second or
 * two in your own thread, which reads as a failure. With it, your own voice
 * plays instantly off the disk it was recorded to.
 *
 * Deliberately small and in-memory: it is a courtesy for the current session,
 * not a cache. The signed URL is the real source.
 */
const localUris = new Map<string, string>();
const LOCAL_URI_LIMIT = 20;

export function localVoiceUri(storagePath: string): string | undefined {
  return localUris.get(storagePath);
}

function rememberLocalUri(storagePath: string, uri: string): void {
  localUris.set(storagePath, uri);
  while (localUris.size > LOCAL_URI_LIMIT) {
    const oldest = localUris.keys().next().value;
    if (oldest === undefined) break;
    localUris.delete(oldest);
  }
}

// ── Upload ──────────────────────────────────────────────────────────────────

function cryptoRandom(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Upload a finished recording and return the attachment to send.
 *
 * Straight to storage like every other attachment — the API never handles the
 * bytes. The path is `<conversationId>/<uuid>.m4a`, which is the shape the
 * bucket's row-level policy already keys on, so the two participants can read
 * it and nobody else can.
 *
 * Reading the bytes takes two different routes, because the two platforms
 * hand back two different kinds of URI. Native gives a file:// path, read
 * with `File.bytes()` — React Native's own Blob is an opaque handle that
 * `storage.upload()` cannot read, and base64 would inflate the payload by a
 * third for nothing. The web recorder gives a blob: URL, and expo-file-system
 * is a no-op there — `fetch` is the only thing that can open one, and it is
 * also the right thing, since the data is already in memory.
 */
export async function uploadVoiceNote(args: {
  conversationId: string;
  uri: string;
  blob?: Blob | null;
  durationMs: number;
  waveform: number[];
}): Promise<MessageAttachment> {
  const { conversationId, uri, blob, durationMs, waveform } = args;

  let bytes: Uint8Array;
  let contentType = NATIVE_CONTENT_TYPE;
  try {
    if (Platform.OS === 'web') {
      // The recorder hands the Blob over directly, so normally nothing is
      // read back at all. `fetch` is the fallback for a blob: URL that
      // arrived from somewhere else — it is the only thing that can open one,
      // expo-file-system being a no-op on the web.
      const data = blob ?? (await (await fetch(uri)).blob());
      // Whatever the browser produced, labelled as what it actually is. The
      // mic button is only offered where MediaRecorder can make MP4
      // (canRecordVoice, and MIME_CANDIDATES in use-voice-recorder.web), so
      // this is a record of the format rather than a gate on it — a gate here
      // could only ever refuse a recording that had already been made.
      contentType = data.type?.startsWith('audio/') ? data.type.split(';')[0]! : WEB_CONTENT_TYPE;
      bytes = new Uint8Array(await data.arrayBuffer());
    } else {
      bytes = await new File(uri).bytes();
    }
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(`Could not read the recording: ${(err as Error).message}`, 'voice');
  }
  if (bytes.byteLength === 0) {
    throw new UploadError('The recording is empty', 'voice');
  }

  const storagePath = `${conversationId}/${cryptoRandom()}.m4a`;
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (error) throw new UploadError(`Upload failed (${storagePath}): ${error.message}`, 'voice');

  rememberLocalUri(storagePath, uri);

  return {
    kind: 'voice',
    storagePath,
    durationMs: Math.max(1, Math.round(durationMs)),
    waveform: resampleWaveform(waveform),
    contentType,
  };
}

