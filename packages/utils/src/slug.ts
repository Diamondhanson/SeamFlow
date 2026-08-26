// ============================================================================
// Turning a business name into a public catalogue address.
//
// The output of this file ends up in `www.seamflowtech.com/t/<slug>` — printed
// on shop signs, pasted into Instagram bios. Two consequences shape the rules
// below:
//
//   1. It must survive being typed by hand off a photograph. That rules out
//      anything case-sensitive, and it is why diacritics are folded rather
//      than dropped: "Atelier Ngözi" becomes `atelier-ngozi`, which someone
//      can retype from memory. Dropping the marked letter instead would give
//      `atelier-ngzi` — unreadable and unguessable.
//
//   2. It is not a security boundary. A catalogue is public by definition, so
//      a guessable slug costs nothing. Don't be tempted to add entropy here;
//      the whole value of the slug is that it reads like the shop's name.
// ============================================================================

/** Hard limits, mirrored by TailorSlugSchema and the DB check constraint. */
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

/**
 * Slugs we refuse to hand out.
 *
 * Not a moderation list — purely structural. These are words that would either
 * read as a SeamFlow-operated page rather than a tailor's shop, or that we may
 * want to use as a real route under /t/ later. Claiming them now is much
 * cheaper than migrating a tailor off one afterwards, once their link is
 * already on a signboard.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'about',
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'blog',
  'contact',
  'dashboard',
  'delete-account',
  'discover',
  'faq',
  'feed',
  'help',
  'home',
  'index',
  'legal',
  'login',
  'new',
  'null',
  'privacy',
  'pricing',
  'public',
  'search',
  'seamflow',
  'settings',
  'signin',
  'signup',
  'static',
  'support',
  'tailor',
  'tailors',
  'terms',
  'undefined',
  'www',
]);

/**
 * Fold a display name down to slug characters.
 *
 * Returns an empty string when nothing usable survives — a name written
 * entirely in a non-Latin script, for instance. Callers must handle that case
 * rather than assuming a non-empty result; `ensureSlug` on the API falls back
 * to a generated address.
 */
export function slugifyBusinessName(name: string): string {
  const folded = name
    // Decompose, then strip the combining marks. é → e + ´ → e.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Common ligatures NFD leaves alone; without these "Cœur" loses a letter.
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'o')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    // Anything that isn't a slug character becomes a separator. Apostrophes are
    // deleted rather than separated, so "L'Atelier" is `latelier`, not
    // `l-atelier`.
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  return trimToLimit(folded);
}

/**
 * Clamp an already-folded string to the length limit without leaving a
 * trailing hyphen behind — `atelier-de-la-` is not a valid slug, and slicing
 * mid-word is exactly how you get one.
 */
function trimToLimit(input: string): string {
  const trimmed = stripHyphens(input);
  if (trimmed.length <= SLUG_MAX_LENGTH) return trimmed;
  return stripHyphens(trimmed.slice(0, SLUG_MAX_LENGTH));
}

function stripHyphens(s: string): string {
  return s.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

/** Shape check only. Says nothing about whether the slug is free or reserved. */
export function isValidSlugShape(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
  );
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Append a disambiguating suffix, keeping the whole thing within the limit.
 *
 * Trims the BASE rather than the suffix, because the suffix is the part that
 * makes the slug unique — shortening it would hand back a collision.
 */
export function withSlugSuffix(base: string, suffix: string | number): string {
  const tail = `-${suffix}`;
  const room = SLUG_MAX_LENGTH - tail.length;
  const head = stripHyphens(base.slice(0, Math.max(room, 0)));
  return `${head}${tail}`;
}

/**
 * Build the public catalogue URL for a slug.
 *
 * One definition, used by the API when it mints a share link and by both apps
 * when they display one, so the host can never drift between them. The host
 * matters more than it looks: Android App Links and iOS Universal Links match
 * on an exact hostname, and a redirect does not save you — by the time a
 * www→apex hop runs, the OS has already handed the URL to the browser. If this
 * ever disagrees with the host serving /.well-known, links stop opening the app.
 */
export function catalogueUrl(webBaseUrl: string, slug: string): string {
  return `${webBaseUrl.replace(/\/$/, '')}/t/${slug}`;
}
