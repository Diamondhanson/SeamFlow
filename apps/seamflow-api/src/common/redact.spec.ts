// Masking is only worth having if it cannot be undone and cannot crash. These
// cases are the shapes that actually reach it: E.164 numbers from the app, the
// odd locally-typed number, and whatever a provider hands back on failure.

import { describe, expect, it } from 'vitest';
import { maskEmail, maskPhone } from './redact';

describe('maskPhone', () => {
  it('keeps the country code and the last four digits', () => {
    expect(maskPhone('+237670000123')).toBe('+237…0123');
  });

  it('strips the separators a typed number carries', () => {
    expect(maskPhone('+237 6 70 00 01 23')).toBe('+237…0123');
  });

  it('does not reveal the middle of a number', () => {
    // The actual requirement: the subscriber digits must not survive.
    expect(maskPhone('+237670000123')).not.toContain('67000');
  });

  it('handles a number with no country code', () => {
    expect(maskPhone('670000123')).toBe('670…0123');
  });

  it('does not leak a short value by printing it whole', () => {
    expect(maskPhone('123')).toBe('•••');
    expect(maskPhone('+12')).toBe('+••');
  });

  it('says so when there is no number, rather than printing undefined', () => {
    expect(maskPhone(null)).toBe('(none)');
    expect(maskPhone(undefined)).toBe('(none)');
    expect(maskPhone('')).toBe('(none)');
  });
});

describe('maskEmail', () => {
  it('keeps the domain, which is what explains a delivery failure', () => {
    expect(maskEmail('ada@example.com')).toBe('a…a@example.com');
  });

  it('does not reveal the local part', () => {
    expect(maskEmail('ada.lovelace@example.com')).not.toContain('lovelace');
  });

  it('keeps a subdomain intact', () => {
    expect(maskEmail('tailor@mail.seamflowtech.com')).toBe('t…r@mail.seamflowtech.com');
  });

  it('does not expand a one-letter local part into itself twice', () => {
    expect(maskEmail('a@example.com')).toBe('a@example.com');
  });

  it('refuses to guess at something that is not an address', () => {
    expect(maskEmail('not-an-email')).toBe('(invalid)');
    expect(maskEmail('@example.com')).toBe('(invalid)');
    expect(maskEmail(null)).toBe('(none)');
  });
});
