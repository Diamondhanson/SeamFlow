// ============================================================================
// Voice — Tier 1, fully on-device (docs/tailor-copilot-plan.md §8).
//
// A sandwich around the copilot: speech-to-text fills the chat input
// (expo-speech-recognition → native iOS Speech / Android SpeechRecognizer),
// text-to-speech reads replies aloud (expo-speech). Nothing leaves the device
// for voice, and the copilot itself is untouched.
//
// Both modules are LAZY-LOADED: `expo-speech-recognition` is a community
// module and older dev builds won't contain either native module — requiring
// them at import time would crash the app on startup. Instead callers probe
// `getVoiceSupport()` and degrade gracefully (mic explains it needs a
// rebuild; replies just don't speak).
// ============================================================================

import type * as ExpoSpeech from 'expo-speech';
import type {
  ExpoSpeechRecognitionModule as SpeechRecModule,
} from 'expo-speech-recognition';
import type { LanguageCode } from './i18n/strings';

type SpeechModule = typeof ExpoSpeech;
type RecognitionModule = typeof SpeechRecModule;

// undefined = not probed yet; null = probed and unavailable on this build.
let speechMod: SpeechModule | null | undefined;
let recognitionMod: RecognitionModule | null | undefined;

function getSpeech(): SpeechModule | null {
  if (speechMod !== undefined) return speechMod;
  try {
    speechMod = require('expo-speech') as SpeechModule;
  } catch {
    speechMod = null;
  }
  return speechMod;
}

function getRecognition(): RecognitionModule | null {
  if (recognitionMod !== undefined) return recognitionMod;
  try {
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: RecognitionModule;
    };
    recognitionMod = mod.ExpoSpeechRecognitionModule;
  } catch {
    recognitionMod = null;
  }
  return recognitionMod;
}

export interface VoiceSupport {
  /** Speech-to-text (mic) available in this build. */
  stt: boolean;
  /** Text-to-speech (spoken replies) available in this build. */
  tts: boolean;
}

export function getVoiceSupport(): VoiceSupport {
  return { stt: getRecognition() !== null, tts: getSpeech() !== null };
}

/** BCP-47 recognizer/speech locale for the app language. */
/**
 * BCP-47 tag for speech recognition and text-to-speech.
 *
 * Typed against LanguageCode rather than a hand-listed union, so adding a UI
 * language is a compile error here until a voice locale is chosen for it —
 * silently falling back to English speech would have the assistant answer a
 * Portuguese tailor in an American accent.
 */
const VOICE_LOCALES: Record<LanguageCode, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  // pt-PT rather than pt-BR: the markets this was added for are Angola and
  // Mozambique, whose speech is closer to European Portuguese.
  pt: 'pt-PT',
  // es-419 (Latin American Spanish) rather than es-ES: the speaker base this
  // was added for is overwhelmingly the Americas.
  es: 'es-419',
  sw: 'sw-KE',
  // Modern Standard Arabic. ar-SA is the most widely supported tag for both
  // recognition and TTS across iOS and Android; the regional variants are
  // patchy, and MSA is what the UI copy is written in.
  ar: 'ar-SA',
};

function localeFor(lang: LanguageCode): string {
  return VOICE_LOCALES[lang] ?? 'en-US';
}

// ----------------------------------------------------------------------------
// Speech-to-text
// ----------------------------------------------------------------------------

/** Ask for mic + speech-recognition access. `canAskAgain: false` means the OS
 *  has permanently silenced its own prompt (a prior denial) — the only path
 *  left is the app's Settings page, so callers must offer that. */
export async function requestMicPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const rec = getRecognition();
  if (!rec) return { granted: false, canAskAgain: true };
  try {
    const res = await rec.requestPermissionsAsync();
    return { granted: res.granted, canAskAgain: res.canAskAgain ?? true };
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

export interface ListenCallbacks {
  /** Streams while the tailor talks — live transcript for the input field. */
  onPartial: (transcript: string) => void;
  /** The finished utterance (may fire more than once on some platforms). */
  onFinal: (transcript: string) => void;
  /** The session ended (stop, natural pause, or error) — reset the mic UI. */
  onEnd: () => void;
  /** Recognition error (e.g. no speech detected). Code is platform-ish. */
  onError?: (code: string) => void;
}

let listenSubs: { remove: () => void }[] = [];

/**
 * Start an on-device recognition session. Returns false when this build has
 * no recognizer (old APK — show the "needs a rebuild" note instead).
 */
export function startListening(lang: LanguageCode, cbs: ListenCallbacks): boolean {
  const rec = getRecognition();
  if (!rec) return false;

  stopListeningCleanup();
  listenSubs = [
    rec.addListener('result', (event) => {
      const transcript = event.results?.[0]?.transcript ?? '';
      if (!transcript) return;
      if (event.isFinal) cbs.onFinal(transcript);
      else cbs.onPartial(transcript);
    }),
    rec.addListener('error', (event) => {
      cbs.onError?.(event.error ?? 'unknown');
    }),
    rec.addListener('end', () => {
      stopListeningCleanup();
      cbs.onEnd();
    }),
  ];

  try {
    rec.start({
      lang: localeFor(lang),
      interimResults: true,
      continuous: false,
    });
    return true;
  } catch {
    stopListeningCleanup();
    return false;
  }
}

/** Stop the current session (the `end` event still fires → onEnd). */
export function stopListening(): void {
  const rec = getRecognition();
  if (!rec) return;
  try {
    rec.stop();
  } catch {
    // ignore
  }
}

function stopListeningCleanup(): void {
  for (const s of listenSubs) s.remove();
  listenSubs = [];
}

// ----------------------------------------------------------------------------
// Text-to-speech
// ----------------------------------------------------------------------------

/**
 * Read `text` aloud in the app language. Returns false when unsupported.
 * `onDone` fires on finish, stop, or error — always reset the UI from it.
 */
export function speak(
  text: string,
  lang: LanguageCode,
  cbs: { onStart?: () => void; onDone: () => void },
): boolean {
  const speech = getSpeech();
  if (!speech) return false;
  try {
    speech.stop();
    speech.speak(text, {
      language: localeFor(lang),
      onStart: cbs.onStart,
      onDone: cbs.onDone,
      onStopped: cbs.onDone,
      onError: cbs.onDone,
    });
    return true;
  } catch {
    cbs.onDone();
    return false;
  }
}

export function stopSpeaking(): void {
  const speech = getSpeech();
  if (!speech) return;
  try {
    speech.stop();
  } catch {
    // ignore
  }
}
