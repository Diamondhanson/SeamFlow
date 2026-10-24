import { isFreshAccount, postAuthHref, safeNext, signInHref } from './auth-return';

describe('safeNext', () => {
  it('accepts in-app paths, including query strings', () => {
    expect(safeNext('/discover/abc')).toBe('/discover/abc');
    expect(safeNext('/discover/inquire?tailorId=1&tailorName=Ann%20D')).toBe(
      '/discover/inquire?tailorId=1&tailorName=Ann%20D',
    );
  });

  it('rejects anything that could leave the app', () => {
    for (const bad of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      'seamflow://x',
      'discover',
      '',
      '  ',
    ]) {
      expect(safeNext(bad)).toBeNull();
    }
  });

  it('rejects control characters and absurd lengths', () => {
    expect(safeNext('/a\nb')).toBeNull();
    expect(safeNext('/' + 'a'.repeat(1001))).toBeNull();
  });

  it('rejects auth screens, which would loop', () => {
    for (const bad of ['/sign-in', '/sign-in?next=/x', '/verify-otp', '/choose-role', '/post-auth', '/auth/callback']) {
      expect(safeNext(bad)).toBeNull();
    }
    // …but a path that merely starts with the same letters is fine.
    expect(safeNext('/sign-instructions')).toBe('/sign-instructions');
  });

  it('rejects non-strings', () => {
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext(['/x'])).toBeNull();
    expect(safeNext(42)).toBeNull();
  });
});

describe('hrefs', () => {
  it('signInHref carries next, encoded, and only when it is safe', () => {
    expect(signInHref()).toBe('/sign-in');
    expect(signInHref('//evil.com')).toBe('/sign-in');
    expect(signInHref('/discover/inquire?a=1&b=2')).toBe(
      '/sign-in?next=' + encodeURIComponent('/discover/inquire?a=1&b=2'),
    );
  });

  it('postAuthHref mirrors it', () => {
    expect(postAuthHref(null)).toBe('/post-auth');
    expect(postAuthHref('/discover/x')).toBe('/post-auth?next=' + encodeURIComponent('/discover/x'));
  });
});

describe('isFreshAccount', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  it('is true for an account made moments ago', () => {
    expect(isFreshAccount('2026-10-24T11:58:00Z', now)).toBe(true);
  });
  it('is false for an older account', () => {
    expect(isFreshAccount('2026-10-20T11:58:00Z', now)).toBe(false);
  });
  it('is false for missing or garbage input', () => {
    expect(isFreshAccount(undefined, now)).toBe(false);
    expect(isFreshAccount('nonsense', now)).toBe(false);
  });
});
