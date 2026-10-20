// ============================================================================
// Unlocking the browser's audio clock.
//
// WHAT GOES WRONG WITHOUT THIS
//
// expo-audio meters the microphone through a Web Audio AnalyserNode hanging
// off a single AudioContext it keeps in a module variable. When it wires the
// analyser up it does this:
//
//     const ctx = getAudioContext();
//     if (ctx.state === 'suspended') ctx.resume();   // not awaited
//     this.analyserSource = ctx.createMediaStreamSource(stream);
//
// A browser creates every AudioContext suspended, and only a user gesture may
// resume one. That `resume()` is not awaited, so the analyser is connected to
// a context that may still be asleep — and a sleeping context produces a
// buffer of perfect zeros. Zeros read as silence, silence draws a flat row.
//
// It is a RACE, which is why it looked random: whether the context happened to
// be awake by the time the first level was read. Recording itself is
// unaffected — MediaRecorder has its own pipeline and never touches the
// AudioContext — so the note always came out fine and only the picture lied.
//
// WHAT THIS DOES
//
// Reaches the same module-level context before recording starts and awaits the
// resume, from inside the tap that is allowed to perform it. Idempotent, so
// the sampler can call it again if it sees the row stay silent.
//
// It imports expo-audio's own internals, which is a liberty — hence the try /
// catch. If a future version moves the file, metering goes back to being
// occasionally flat, which is exactly where it is today. Nothing breaks.
// ============================================================================

import { getAudioContext } from 'expo-audio/build/AudioUtils.web';

export async function warmUpAudioMetering(): Promise<void> {
  try {
    const ctx = getAudioContext() as AudioContext | undefined;
    if (ctx && ctx.state !== 'running') await ctx.resume();
  } catch {
    // Internals moved, or the browser refused. The recording is unaffected.
  }
}
