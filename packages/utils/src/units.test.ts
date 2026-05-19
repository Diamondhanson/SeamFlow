import { describe, it, expect } from 'vitest';
import { cmToInches, inchesToCm, formatLength } from './units';

describe('units', () => {
  it('roundtrips cm → in → cm without precision loss', () => {
    const cm = 96.5;
    expect(inchesToCm(cmToInches(cm))).toBeCloseTo(cm, 6);
  });

  it('converts 2.54 cm to exactly 1 in', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 6);
  });

  it('formats length with default 1 fraction digit', () => {
    expect(formatLength(96.5, 'cm')).toBe('96.5 cm');
    expect(formatLength(38, 'in', 0)).toBe('38 in');
  });
});
