// ============================================================================
// The web's audio engine, owned by us.
//
// WHY WE DO NOT USE expo-audio ON THE WEB
//
// Its web layer is a thin shim over `<audio>` and `MediaRecorder`, and three
// things in it are wrong in ways that only show up in Safari. They are quoted
// here from node_modules/expo-audio/src so the next person does not have to go
// looking.
//
// 1. The recorder's level meter builds a graph with no destination:
//
//        this.analyserSource = ctx.createMediaStreamSource(stream);
//        this.analyser = ctx.createAnalyser();
//        this.analyserSource.connect(this.analyser);   // and nowhere else
//
//    Web Audio only renders nodes on a path to `ctx.destination`. Chrome pulls
//    a media-stream source anyway; WebKit does not, so the analyser is handed
//    silence and the row sits flat however loudly you talk. It also calls
//    `ctx.resume()` from wherever `prepareToRecordAsync()` happened to be
//    awaited — which on iOS is not a user gesture, so the context never starts
//    and the meter reads -160 forever. That is the "sometimes it animates,
//    sometimes it doesn't": it animated only when something earlier on the
//    page had already started the context.
//
// 2. The player plays a `blob:` URL through an `<audio>` element. On iOS that
//    element is AVFoundation, which will not reliably open the fragmented MP4
//    MediaRecorder produces out of a blob URL — and when it refuses there is
//    nothing to catch, because expo-audio never looks at what `play()`
//    returned:
//
//        play(): void { ...; this.media.play(); this.isPlaying = true; }
//
//    So the UI says it is playing and no sound comes out.
//
// 3. The bubble arms its player on first press and starts it from the effect
//    that follows. A `play()` one React render after the tap is no longer
//    inside the gesture, and Safari rejects it.
//
// WHAT THIS DOES INSTEAD
//
// One AudioContext for the whole app, started on the first real tap. Recording
// reads levels from an analyser wired THROUGH A SILENT GAIN NODE to the
// destination, so the graph is on a rendered path in every engine. Playback
// decodes the clip once and plays the samples through an AudioBufferSourceNode
// — no media element, no container parsing, no autoplay policy to satisfy
// beyond the context already being awake.
//
// Decoding costs one pass over a file that is under half a megabyte, and buys
// position tracking accurate to the sample, instant seeking, and a waveform
// measured from the audio rather than guessed at from a meter.
// ============================================================================

/** Started lazily, and only ever from a user gesture. See `unlockAudio`. */
let context: AudioContext | null = null;

type Ctor = new () => AudioContext;

export function audioContext(): AudioContext {
  if (!context) {
    const w = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) throw new Error('This browser has no Web Audio');
    context = new Ctx();
  }
  return context;
}

/**
 * Start the audio clock. **Must be called synchronously inside a tap.**
 *
 * Every browser starts an AudioContext suspended and only lets a gesture wake
 * it. `resume()` returns a promise, but the permission is granted at the
 * moment of the call — so this is deliberately not async, and callers must not
 * await anything before it.
 *
 * The one-sample buffer is the part that is easy to leave out and the part
 * iOS actually requires: on WebKit a context is not considered unlocked until
 * something has been played through it, and `resume()` alone can settle back
 * to `suspended` the moment the gesture ends.
 */
export function unlockAudio(): void {
  try {
    const ctx = audioContext();
    if (ctx.state !== 'running') void ctx.resume();
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, Math.max(8000, ctx.sampleRate));
    silent.connect(ctx.destination);
    silent.start(0);
  } catch {
    // No Web Audio at all. canRecordVoice() already hides recording there,
    // and playback will fall back to reporting a load failure.
  }
}

/** Is the clock actually running? Used to explain a failure, not to gate one. */
export function audioAwake(): boolean {
  return context?.state === 'running';
}

// ── Decoding ────────────────────────────────────────────────────────────────

/**
 * Decode compressed audio to samples.
 *
 * Both call shapes, because Safari only grew the promise-returning form
 * recently and the callback form is still the one it implements natively.
 * `decodeAudioData` also DETACHES the buffer it is given, so callers must not
 * reuse it afterwards — everything here hands over a fresh one.
 */
export function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = audioContext();
  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;
    const ok = (b: AudioBuffer) => {
      if (!settled) {
        settled = true;
        resolve(b);
      }
    };
    const fail = (e: unknown) => {
      if (!settled) {
        settled = true;
        reject(e instanceof Error ? e : new Error('Could not decode the audio'));
      }
    };
    try {
      const maybe = ctx.decodeAudioData(data, ok, fail);
      if (maybe && typeof maybe.then === 'function') void maybe.then(ok, fail);
    } catch (e) {
      fail(e);
    }
  });
}

/**
 * Clips already decoded, keyed by the URL they came from.
 *
 * The point is a note you just recorded: the recorder decodes it to measure
 * the waveform, so by the time you press play the samples are already here and
 * playback starts in the same frame as the tap. Small and capped — the signed
 * URL is always the real source, this only ever saves work.
 */
const decoded = new Map<string, AudioBuffer>();
const DECODE_CACHE_LIMIT = 8;

export function cacheDecoded(url: string, buffer: AudioBuffer): void {
  decoded.set(url, buffer);
  while (decoded.size > DECODE_CACHE_LIMIT) {
    const oldest = decoded.keys().next().value;
    if (oldest === undefined) break;
    decoded.delete(oldest);
  }
}

export function getDecoded(url: string): AudioBuffer | undefined {
  return decoded.get(url);
}

/** Fetch and decode, or hand back what we already decoded. */
export async function loadClip(url: string): Promise<AudioBuffer> {
  const hit = decoded.get(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch the audio (${res.status})`);
  const buffer = await decodeAudio(await res.arrayBuffer());
  cacheDecoded(url, buffer);
  return buffer;
}

// ── The waveform, from the samples ──────────────────────────────────────────

/** Below this peak the clip is silence, not something to amplify into noise. */
const SILENCE_PEAK = 0.012;

/**
 * Peaks per bucket, normalised against the clip's own loudest moment.
 *
 * Peak rather than mean: averaging flattens speech into a smooth hump, while
 * peaks keep the shape of the sentence. Normalising means a note recorded at
 * arm's length and one recorded close up both fill the row — without it every
 * quiet recording draws as a flat line that reads as broken.
 */
export function peaksFromBuffer(buffer: AudioBuffer, bars: number): number[] {
  const samples = buffer.getChannelData(0);
  if (samples.length === 0) return [];
  const per = samples.length / bars;
  const peaks: number[] = [];
  let loudest = 0;
  for (let i = 0; i < bars; i++) {
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
  if (loudest < SILENCE_PEAK) return peaks.map(() => 0);
  return peaks.map((p) => Math.max(0, Math.min(100, Math.round((p / loudest) * 100))));
}

// ── Playing one clip ────────────────────────────────────────────────────────

/**
 * A decoded clip, with a position.
 *
 * An AudioBufferSourceNode is single-use and has no position of its own: it
 * plays from an offset and is then spent. So pausing stops the node and
 * remembers where it got to, and resuming starts a fresh one from there. The
 * position comes from the context's own clock, which is the same clock the
 * samples are played on — accurate to the sample and unaffected by how busy
 * the main thread is.
 */
export class AudioClip {
  private node: AudioBufferSourceNode | null = null;
  private readonly out: GainNode;
  /** Where in the clip the live node started. */
  private offset = 0;
  /** The context time at which it started. */
  private startedAt = 0;
  private rate = 1;

  constructor(
    private readonly buffer: AudioBuffer,
    private readonly onEnded: () => void,
  ) {
    const ctx = audioContext();
    this.out = ctx.createGain();
    this.out.connect(ctx.destination);
  }

  get duration(): number {
    return this.buffer.duration;
  }

  get playing(): boolean {
    return this.node !== null;
  }

  get currentTime(): number {
    if (!this.node) return this.offset;
    const elapsed = (audioContext().currentTime - this.startedAt) * this.rate;
    return Math.max(0, Math.min(this.duration, this.offset + elapsed));
  }

  play(): void {
    if (this.node) return;
    const ctx = audioContext();
    if (ctx.state !== 'running') void ctx.resume();

    // Pressing play on a finished note starts it again, which is what people
    // do with the half they did not catch.
    const from = this.offset >= this.duration - 0.05 ? 0 : this.offset;

    const node = ctx.createBufferSource();
    node.buffer = this.buffer;
    node.playbackRate.value = this.rate;
    node.connect(this.out);
    node.onended = () => {
      // A seek or a pause replaces the node and clears this first, so an
      // `ended` arriving from the node we deliberately stopped is ignored.
      if (this.node !== node) return;
      this.node = null;
      this.offset = 0;
      this.onEnded();
    };

    this.offset = from;
    this.startedAt = ctx.currentTime;
    node.start(0, from);
    this.node = node;
  }

  pause(): void {
    const node = this.node;
    if (!node) return;
    const at = this.currentTime;
    this.node = null;
    node.onended = null;
    try {
      node.stop();
    } catch {
      // Already finished of its own accord.
    }
    this.offset = Math.max(0, Math.min(this.duration, at));
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    this.pause();
    this.offset = Math.max(0, Math.min(this.duration, seconds));
    if (wasPlaying) this.play();
  }

  setRate(rate: number): void {
    if (this.node) {
      // Re-anchor, or the position would be computed with the new rate over
      // time already played at the old one.
      const at = this.currentTime;
      this.rate = rate;
      this.seek(at);
    } else {
      this.rate = rate;
    }
  }

  release(): void {
    this.pause();
    try {
      this.out.disconnect();
    } catch {
      // Already torn down.
    }
  }
}
