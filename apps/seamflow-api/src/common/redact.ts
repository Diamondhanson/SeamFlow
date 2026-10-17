// ============================================================================
// Identifiers that are safe to put in a log line.
//
// Render keeps the API's logs and Sentry keeps a copy of anything attached to
// an error, so a log line is a second place personal data lives — one with a
// different retention period, a different set of people who can read it, and
// no deletion path when an account asks to be erased.
//
// A log exists to make a failure diagnosable. For that, the last digits of a
// number and the domain of an address are enough: they let you match a line to
// a support conversation and tell two failures apart. The whole value adds
// nothing an engineer needs and plenty a breach would want.
// ============================================================================

/**
 * `+237670000123` → `+237…0123`. Keeps the country code (which tells you
 * whether a route or a provider is at fault) and the last four digits (enough
 * to match against the person in front of you), drops the rest.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '(none)';
  const trimmed = String(phone).trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 4) return plus ? `+${'•'.repeat(digits.length)}` : '•'.repeat(digits.length);
  const cc = digits.slice(0, Math.min(3, digits.length - 4));
  return `${plus ? '+' : ''}${cc}…${digits.slice(-4)}`;
}

/**
 * `ada@example.com` → `a…a@example.com`. The domain is the part that explains
 * a delivery failure; the local part is the person.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '(none)';
  const value = String(email).trim();
  const at = value.lastIndexOf('@');
  if (at <= 0) return '(invalid)';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const shown = local.length <= 2 ? local[0] : `${local[0]}…${local[local.length - 1]}`;
  return `${shown}@${domain}`;
}
