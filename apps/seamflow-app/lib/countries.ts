// ============================================================================
// Country helpers — thin, reusable layer over the bundled COUNTRY_NAMES map.
//
// COUNTRY_NAMES is auto-generated (ISO 3166-1 alpha-2 → English name) and must
// not be hand-edited, so the presentation helpers live here instead:
//
//   countryName('CM')  → 'Cameroon'
//   flagEmoji('CM')    → 🇨🇲   (regional-indicator pair; letters on Android
//                               fonts that lack flag glyphs — still legible)
//   ALL_COUNTRIES      → [{ cc, name }, …] sorted by name, for pickers.
// ============================================================================

import { COUNTRY_NAMES } from './countryNames';

export interface CountryOption {
  cc: string;
  name: string;
}

/** Full country name for an ISO2 code; falls back to the code itself. */
export function countryName(cc: string | null | undefined): string {
  if (!cc) return '';
  return COUNTRY_NAMES[cc.toUpperCase()] ?? cc.toUpperCase();
}

/** Regional-indicator flag emoji from an ISO2 code. */
export function flagEmoji(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🏳️';
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Every known country, sorted by name — the data source for country pickers. */
export const ALL_COUNTRIES: CountryOption[] = Object.entries(COUNTRY_NAMES)
  .map(([cc, name]) => ({ cc, name }))
  .sort((a, b) => a.name.localeCompare(b.name));
