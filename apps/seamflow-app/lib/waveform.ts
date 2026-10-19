// ============================================================================
// Waveform arithmetic and the clock — the pure half of a voice note.
//
// Separated from lib/voice-note deliberately: everything here is arithmetic
// with no microphone, no file system and no network behind it, which is what
// makes it testable in isolation. The decisions it encodes — where silence
// starts, why peaks rather than averages — are the ones that decide whether a
// waveform looks like speech or like a bar chart, so they are worth pinning
// down with tests rather than with a screenshot.
// ============================================================================

import { VOICE_WAVEFORM_BARS } from '@seamflow/schemas';

/**
 * A metering reading (decibels, roughly -60…0) as a 0–100 bar height.
 *
 * Decibels are logarithmic and the bottom of the range is silence nobody needs
 * to see, so anything under -55 dB flattens to zero and the rest is stretched
 * across the full height. The result is a row that looks like speech instead
 * of a nearly-flat line with occasional spikes.
 */
export function meterToLevel(db: number | undefined): number {
  if (db == null || Number.isNaN(db)) return 0;
  const FLOOR = -55;
  if (db <= FLOOR) return 0;
  const ratio = (db - FLOOR) / -FLOOR;
  // Square root lifts the quiet half: normal speech sits well below 0 dB and
  // a linear mapping leaves it as a stub.
  return Math.max(0, Math.min(100, Math.round(Math.sqrt(ratio) * 100)));
}

/**
 * Reduce however many readings we captured to a fixed number of bars.
 *
 * Fixed, so a six-second note and a two-minute one are drawn at the same width
 * and read as the same control. Each output bar is the PEAK of its slice, not
 * the mean: averaging flattens speech into a smooth hump, while peaks keep the
 * shape of the sentence.
 */
export function resampleWaveform(levels: number[], bars = VOICE_WAVEFORM_BARS): number[] {
  if (levels.length === 0) return [];
  if (levels.length <= bars) return levels.map((l) => Math.round(l));
  const out: number[] = [];
  const per = levels.length / bars;
  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * per);
    const end = Math.max(start + 1, Math.floor((i + 1) * per));
    let peak = 0;
    for (let j = start; j < end && j < levels.length; j++) peak = Math.max(peak, levels[j]!);
    out.push(Math.round(peak));
  }
  return out;
}

/** `83_000` → `1:23`. The one place a duration is turned into a label. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
