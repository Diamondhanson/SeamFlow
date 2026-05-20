import { describe, it, expect } from 'vitest';
import { formatOrderShareMessage, phoneToWaMeDigits } from './share-message';

describe('formatOrderShareMessage', () => {
  it('plain — no name, no tailor', () => {
    const msg = formatOrderShareMessage({ url: 'https://x.test/o/abc', orderName: 'Suit' });
    expect(msg).toBe("Here's your order — Suit\n\nView details: https://x.test/o/abc");
  });

  it('greets by first name when full name given', () => {
    const msg = formatOrderShareMessage({
      url: 'https://x.test/o/abc',
      orderName: 'Wedding suit',
      clientName: 'Tunde Olabisi',
    });
    expect(msg.startsWith('Hi Tunde — ')).toBe(true);
  });

  it('appends tailor signature when provided', () => {
    const msg = formatOrderShareMessage({
      url: 'https://x.test/o/abc',
      orderName: 'Gown',
      tailorBusinessName: 'Studio Tunde',
    });
    expect(msg.endsWith('— Studio Tunde')).toBe(true);
  });

  it('falls back to plain greeting on whitespace-only clientName', () => {
    const msg = formatOrderShareMessage({
      url: 'https://x.test/o/abc',
      orderName: 'Gown',
      clientName: '   ',
    });
    expect(msg.startsWith("Here's your order")).toBe(true);
  });
});

describe('phoneToWaMeDigits', () => {
  it('strips + and spaces from E.164', () => {
    expect(phoneToWaMeDigits('+2348030001234')).toBe('2348030001234');
    expect(phoneToWaMeDigits('+1 415 555 0100')).toBe('14155550100');
  });

  it('returns null for empty / short input', () => {
    expect(phoneToWaMeDigits(null)).toBeNull();
    expect(phoneToWaMeDigits('')).toBeNull();
    expect(phoneToWaMeDigits('+12')).toBeNull();
  });
});
