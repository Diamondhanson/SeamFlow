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
  // Native only, and that is not a limitation being worked around — it is the
  // fix. expo-audio's web meter hangs an AnalyserNode off the stream
  // MediaRecorder is capturing, and once its AudioContext is awake that graph
  // starves the recorder on Safari: the file comes back empty, so nothing
  // plays and nothing sends. Suspended it is inert but reads zero. One or the
  // other, and the recording wins. The web measures the waveform after the
  // fact instead — see lib/waveform-from-audio.web.
  isMeteringEnabled: Platform.OS !== 'web',
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

/**
 * Can this device record something the other side will be able to play?
 *
 * Native: always. Web: only where MediaRecorder can produce MP4 — see the
 * header. Checked rather than assumed, because the answer differs between two
 * versions of the same browser.
 */
export function canRecordVoice(): boolean {
  if (Platform.OS !== 'web') return true;
  const MR = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } })
    .MediaRecorder;
  return !!MR?.isTypeSupported?.(WEB_CONTENT_TYPE);
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
  durationMs: number;
  waveform: number[];
}): Promise<MessageAttachment> {
  const { conversationId, uri, durationMs, waveform } = args;

  let bytes: Uint8Array;
  let contentType = NATIVE_CONTENT_TYPE;
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      // What the browser ACTUALLY produced, not what we asked for. If a
      // future version of expo-audio stops honouring the mime type, this is
      // what stops us uploading a WebM under an .m4a name and leaving every
      // iPhone recipient with a note that will not play.
      if (!blob.type.startsWith('audio/mp4') && !blob.type.startsWith('audio/aac')) {
        throw new UploadError(`This browser recorded ${blob.type || 'an unknown format'}`, 'voice');
      }
      contentType = WEB_CONTENT_TYPE;
      bytes = new Uint8Array(await blob.arrayBuffer());
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

