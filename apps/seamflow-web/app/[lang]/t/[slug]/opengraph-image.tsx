/**
 * Each language route needs its own copy of this file — Next resolves
 * `opengraph-image` per route segment, so without it /<lang>/t/<slug> would
 * fall back to the site-wide SeamFlow card instead of the tailor's work.
 *
 * The card carries no prose, so there is nothing to translate; it re-exports
 * the English route's implementation rather than duplicating it.
 */
export { default, alt, size, contentType } from '../../../(en)/t/[slug]/opengraph-image';
