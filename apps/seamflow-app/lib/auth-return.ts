// ============================================================================
// Signing in without losing your place — and without changing sides.
//
// Everything that needs an account sends a signed-out person to /sign-in: the
// profile icon, "send an enquiry", saving a measurement. After success they used
// to be dropped on the DESIGNER home (`router.replace('/(app)')`), whoever they
// were and wherever they came from — a customer who only wanted to message a
// tailor landed on an empty business dashboard.
//
// Now the caller says where it is (`?next=`), sign-in returns there, and with no
// `next` the choice is made from the profile (app/post-auth.tsx): a shop owner
// goes to their shop, everyone else stays on the customer side.
// ============================================================================

/** Auth screens a `next` must never point at — that would loop. */
const AUTH_ROUTES = /^\/(sign-in|verify-otp|reset-password|choose-role|post-auth|auth)(\/|\?|#|$)/;

/**
 * Accept only a path inside this app. `next` arrives from a URL, so it is
 * untrusted: a scheme, a protocol-relative `//host`, or a backslash trick must
 * never be navigated to.
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v || v.length > 1000) return null;
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null;
  if (/[\u0000-\u001f]/.test(v)) return null;
  if (AUTH_ROUTES.test(v)) return null;
  return v;
}

/** `/sign-in`, carrying where to come back to when there is one. */
export function signInHref(next?: string | null): string {
  const n = safeNext(next);
  return n ? `/sign-in?next=${encodeURIComponent(n)}` : '/sign-in';
}

/** Where to go once a session exists; the router there decides the rest. */
export function postAuthHref(next?: string | null): string {
  const n = safeNext(next);
  return n ? `/post-auth?next=${encodeURIComponent(n)}` : '/post-auth';
}

/**
 * Was this account created moments ago? Google and Apple sign-in create the
 * account on first use with no separate sign-up step, so this is how a brand-new
 * account is told apart from a returning one.
 */
export function isFreshAccount(
  createdAt: string | null | undefined,
  now: number = Date.now(),
  windowMs: number = 5 * 60 * 1000,
): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  return now - t >= -windowMs && now - t <= windowMs;
}
