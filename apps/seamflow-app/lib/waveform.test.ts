// The two decisions that make a waveform look like speech — where silence
// starts, and peaks rather than averages — plus the clock, which is the only
// thing on a voice note that anyone reads as a number.

import { formatClock, meterToLevel, resampleWaveform } from './waveform';

describe('meterToLevel', () => {
  it('treats a device that reports nothing as silence', () => {
    // Not every device meters. A bar of NaN height renders as nothing at all.
    expect(meterToLevel(undefined)).toBe(0);
    expect(meterToLevel(NaN)).toBe(0);
  });

  it('flattens the bottom of the range, where there is nothing to see', () => {
    expect(meterToLevel(-60)).toBe(0);
    expect(meterToLevel(-55)).toBe(0);
  });

  it('puts the loudest possible reading at full height', () => {
    expect(meterToLevel(0)).toBe(100);
  });

  it('lifts ordinary speech well clear of the floor', () => {
    // -30 dB is a person talking at arm's length. Mapped linearly it would be
    // a 45% stub; the curve is what stops every real recording looking quiet.
    expect(meterToLevel(-30)).toBeGreaterThan(60);
  });

  it('never leaves the scale, whatever the device claims', () => {
    expect(meterToLevel(12)).toBe(100);
    expect(meterToLevel(-999)).toBe(0);
  });
});

describe('resampleWaveform', () => {
  it('keeps a short recording exactly as it was', () => {
    expect(resampleWaveform([10, 20, 30], 44)).toEqual([10, 20, 30]);
  });

  it('reduces a long recording to the agreed number of bars', () => {
    const levels = Array.from({ length: 1200 }, (_, i) => i % 100);
    expect(resampleWaveform(levels, 44)).toHaveLength(44);
  });

  it('keeps peaks rather than averaging them away', () => {
    // One loud syllable in a quiet stretch. An average would bury it; the
    // whole point of the row is that you can see where the words are.
    const levels = [0, 0, 0, 0, 0, 0, 0, 90, 0, 0];
    expect(Math.max(...resampleWaveform(levels, 5))).toBe(90);
  });

  it('survives a recording that metered nothing', () => {
    expect(resampleWaveform([], 44)).toEqual([]);
  });

  it('stays inside the range the contract allows', () => {
    const out = resampleWaveform(Array.from({ length: 500 }, () => 100), 44);
    expect(out.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)).toBe(true);
  });
});

describe('formatClock', () => {
  it('pads the seconds, so the row never changes width mid-playback', () => {
    expect(formatClock(5_000)).toBe('0:05');
    expect(formatClock(65_000)).toBe('1:05');
  });

  it('reads the cap as two minutes exactly', () => {
    expect(formatClock(120_000)).toBe('2:00');
  });

  it('never shows a negative clock', () => {
    expect(formatClock(-1)).toBe('0:00');
  });
});
