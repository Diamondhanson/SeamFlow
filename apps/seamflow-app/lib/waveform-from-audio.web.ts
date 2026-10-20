// ============================================================================
// Reading a waveform back out of a finished recording.
//
// WHY THE WEB CANNOT MEASURE WHILE IT RECORDS
//
// expo-audio's level meter works by hanging an AnalyserNode off the very
// stream MediaRecorder is capturing:
//
//     this.analyserSource = ctx.createMediaStreamSource(stream);
//     this.analyser = ctx.createAnalyser();
//     this.analyserSource.connect(this.analyser);   // and nowhere else
//
// That graph has no destination. While its AudioContext is suspended the
// whole thing is inert and harmless — which is why recording always worked
// and the meter always read zero. Wake the context and the graph starts
// pulling from the stream, and on Safari the MediaRecorder reading the same
// stream is starved: the recording comes back empty.
//
// So on the web it is genuinely one or the other, and the recording wins.
// Metering is switched off there (see VOICE_RECORDING_OPTIONS) and the
// waveform is measured afterwards instead, from the file itself.
//
// WHICH IS BETTER ANYWAY
//
// A live meter samples twenty times a second and hopes that is representative.
// This reads every sample in the clip. Nothing can be missed between ticks,
// the shape is the same every time the same audio is decoded, and it costs one
// pass over a file that is under half a megabyte. The only thing lost is the
// row moving WHILE you speak, which is why the recorder still shows a live
// row on native, where metering is safe.
//
// Decoding happens after the capture has finished, so it cannot disturb it.
// ============================================================================

import { VOICE_WAVEFORM_BARS } from '@seamflow/schemas';

/** Below this peak the clip is silence, not something to amplify into noise. */
const SILENCE_PEAK = 0.015;

export async function waveformFromRecording(uri: string): Promise<number[] | null> {
  let ctx: AudioContext | null = null;
  try {
    const bytes = await (await fetch(uri)).arrayBuffer();
    if (bytes.byteLength === 0) return null;

    ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(bytes);
    const samples = audio.getChannelData(0);
    if (samples.length === 0) return null;

    // Peak per bucket, not mean: averaging flattens speech into a smooth hump,
    // while peaks keep the shape of the sentence. Same rule as the live path.
    const per = samples.length / VOICE_WAVEFORM_BARS;
    const peaks: number[] = [];
    let loudest = 0;
    for (let i = 0; i < VOICE_WAVEFORM_BARS; i++) {
      const start = Math.floor(i * per);
      const end = Math.min(samples.length, Math.floor((i + 1) * per));
      let peak = 0;
      for (let j = start; j < end; j++) {
        const v = samples[j]! < 0 ? -samples[j]! : samples[j]!;
        if (v > peak) peak = v;
      }
      peaks.push(peak);
      if (peak > loudest) loudest = peak;
    }

    // Normalised against the clip's own loudest moment, so a note recorded at
    // arm's length and one recorded close up both fill the row. Without this
    // every quiet recording would draw as a flat line that looks broken.
    if (loudest < SILENCE_PEAK) return peaks.map(() => 0);
    return peaks.map((p) => Math.max(0, Math.min(100, Math.round((p / loudest) * 100))));
  } catch {
    // An undecodable file still sends; it just draws the plain track.
    return null;
  } finally {
    void ctx?.close();
  }
}
