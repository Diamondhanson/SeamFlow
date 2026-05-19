import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidPhone } from './phone';

describe('phone', () => {
  it('normalizes a US number to E.164', () => {
    expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671');
  });

  it('normalizes a Nigerian number using default country', () => {
    expect(normalizePhone('0803 123 4567', 'NG')).toBe('+2348031234567');
  });

  it('returns null for clearly invalid input', () => {
    expect(normalizePhone('not a phone')).toBeNull();
    expect(isValidPhone('not a phone')).toBe(false);
  });

  it('isValidPhone agrees with normalizePhone', () => {
    expect(isValidPhone('+14155552671')).toBe(true);
  });
});
