/**
 * The French route needs its own copy of this file — Next resolves
 * `opengraph-image` per route segment, and without it /fr/t/<slug> would fall
 * back to the site-wide SeamFlow card instead of showing the tailor's work.
 *
 * The card itself carries no prose, so there is nothing to translate; it
 * re-exports the English route's implementation rather than duplicating it.
 */
export { default, alt, size, contentType } from '../../../t/[slug]/opengraph-image';
