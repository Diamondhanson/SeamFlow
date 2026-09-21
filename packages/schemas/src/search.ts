// ============================================================================
// Turning what someone typed into what they meant.
//
// Discover's search originally ran `ILIKE '%term%'` over a caption, a free-text
// garment type and an empty tags column. Measured against the live feed:
//
//   "robe", "rouge", "vert", "robe de mariée"   → 0 results
//   "green"                                     → 0, though "Green Two-Piece
//                                                 with Hat" was right there —
//                                                 titles were never searched
//   "red"                                       → 6 results, all wrong: it
//                                                 matched cove-RED, gathe-RED,
//                                                 structu-RED, embroide-RED
//
// So in a French-speaking market most searches found nothing, and the one that
// "worked" returned noise. This module is the fix's brain; the SQL that runs
// it lives in FeedService.
//
// THE IDEA
// Every word a shopper might use for a garment, colour or style already exists
// in our vocabularies, in six languages, pointing at a stable key. So a query
// is resolved against those labels FIRST. "robe" becomes {dress, wedding gown,
// evening gown…}; "rouge" becomes {red}. Search then matches on the KEY — which
// works on every newly published design regardless of the language it was
// described in — AND on every translation of the key in the free text, which
// is what lets a French query find an old post captioned in English.
//
// Words that match no vocabulary are kept as plain terms and matched as whole
// words, never as fragments. That is the "cove-RED" fix.
// ============================================================================

import { GARMENT_TYPES } from './garment';
import { DESIGN_ATTRIBUTES, DESIGN_COLORS } from './design-attributes';

/** One thing the shopper asked for. Every concept in a query must be satisfied. */
export interface SearchConcept {
  /** What they typed for this concept, normalised. */
  source: string;
  garmentKeys: string[];
  colorKeys: string[];
  attributeKeys: string[];
  /**
   * Every label of every matched key, in every language, normalised. Used to
   * match free text on posts that predate structured attributes — which today
   * is all of them.
   */
  phrases: string[];
}

export interface ParsedSearch {
  concepts: SearchConcept[];
  /** Words that matched no vocabulary. Matched as whole words in free text. */
  terms: string[];
}

/**
 * Lowercase, strip accents, turn punctuation into spaces, collapse whitespace.
 *
 * Unicode-aware on purpose: `\p{L}` keeps Arabic and Swahili letters, where a
 * naive `[a-z]` would delete them and turn an Arabic query into nothing.
 * Accents are removed by decomposing (NFD) and dropping combining marks, which
 * is exactly what Postgres `unaccent` does to the other side of the comparison.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Glue words in the six supported languages. Dropped from free-text terms so
 * "robe de soirée" does not also demand the word "de" appear in a caption.
 */
const STOPWORDS = new Set([
  // en
  'a', 'an', 'the', 'and', 'or', 'with', 'for', 'of', 'in', 'on',
  // fr
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'en', 'avec', 'pour', 'au', 'aux',
  // pt / es
  'e', 'o', 'os', 'as', 'da', 'do', 'das', 'dos', 'com', 'para', 'el', 'los', 'las', 'y', 'con', 'por',
  // sw
  'na', 'ya', 'wa', 'kwa', 'za',
  // ar
  'و', 'في', 'من', 'مع',
]);

/** Below this a label is too short to match safely ("or", "uni" collide). */
const MIN_LABEL = 3;

type Kind = 'garment' | 'color' | 'attribute';
interface LabelEntry {
  kind: Kind;
  key: string;
  label: string;
}

const LANGS = ['en', 'fr', 'pt', 'es', 'sw', 'ar'] as const;

/** Built once: every label in every language, longest first. */
const LABELS: LabelEntry[] = (() => {
  const out: LabelEntry[] = [];
  const push = (kind: Kind, key: string, raw: string) => {
    const label = normalizeForSearch(raw);
    if (label.length >= MIN_LABEL) out.push({ kind, key, label });
  };
  for (const g of GARMENT_TYPES) {
    // "Something else" is a picker escape hatch, not a garment anyone searches
    // for — indexing it made "something for the weekend" a garment query.
    if (g.key === 'other') continue;
    push('garment', g.key, g.key.replace(/_/g, ' '));
    for (const l of LANGS) push('garment', g.key, g[l]);
  }
  for (const c of DESIGN_COLORS) {
    for (const l of LANGS) push('color', c.key, c[l]);
  }
  for (const a of DESIGN_ATTRIBUTES) {
    push('attribute', a.key, a.key.replace(/_/g, ' '));
    for (const l of LANGS) push('attribute', a.key, a[l]);
  }
  // Longest first, so "robe de mariee" is claimed before "robe" can split it.
  return out.sort((x, y) => y.label.length - x.label.length);
})();

/** Every translated label for a key, for matching legacy free text. */
function phrasesFor(kind: Kind, key: string): string[] {
  return LABELS.filter((e) => e.kind === kind && e.key === key).map((e) => e.label);
}

function conceptFrom(source: string, entries: LabelEntry[]): SearchConcept {
  const garmentKeys = [...new Set(entries.filter((e) => e.kind === 'garment').map((e) => e.key))];
  const colorKeys = [...new Set(entries.filter((e) => e.kind === 'color').map((e) => e.key))];
  const attributeKeys = [
    ...new Set(entries.filter((e) => e.kind === 'attribute').map((e) => e.key)),
  ];
  const phrases = new Set<string>([source]);
  for (const k of garmentKeys) phrasesFor('garment', k).forEach((p) => phrases.add(p));
  for (const k of colorKeys) phrasesFor('color', k).forEach((p) => phrases.add(p));
  for (const k of attributeKeys) phrasesFor('attribute', k).forEach((p) => phrases.add(p));
  return { source, garmentKeys, colorKeys, attributeKeys, phrases: [...phrases] };
}

export function parseSearchQuery(raw: string): ParsedSearch {
  let rest = ` ${normalizeForSearch(raw)} `;
  const concepts: SearchConcept[] = [];

  // Pass 1 — whole labels, longest first. "robe de mariee" is one concept, not
  // "robe" + "mariee"; "long sleeve" is one attribute, not two stray words.
  for (const entry of LABELS) {
    const needle = ` ${entry.label} `;
    if (!rest.includes(needle)) continue;
    // Same phrase can be a label for several keys (e.g. a word shared by two
    // garments in one language) — gather them all into one concept. A ONE-word
    // label also brings its family: "robe" is the French for dress, but someone
    // typing it means robe de mariée and robe de soirée as well.
    const oneWord = !entry.label.includes(' ');
    const same = LABELS.filter((e) =>
      oneWord ? e.label.split(' ').includes(entry.label) : e.label === entry.label,
    );
    concepts.push(conceptFrom(entry.label, same));
    rest = rest.replace(needle, ' ');
  }

  // Pass 2 — single leftover words that START a word of some label. This is
  // what makes "robe" alone reach "robe de mariee" and "robe de soiree" too:
  // someone typing "robe" means the whole family, not only the plain dress.
  const terms: string[] = [];
  for (const word of rest.trim().split(' ').filter(Boolean)) {
    if (STOPWORDS.has(word)) continue;
    const hits =
      word.length >= 4
        ? LABELS.filter((e) => e.label.split(' ').some((w) => w.startsWith(word)))
        : LABELS.filter((e) => e.label.split(' ').includes(word));
    if (hits.length > 0) concepts.push(conceptFrom(word, hits));
    else if (word.length >= 2) terms.push(word);
  }

  // A word found in pass 2 might also have been glued into a pass-1 phrase's
  // family; that is fine — concepts are ANDed, and a concept's keys are ORed.
  return { concepts, terms };
}

/** Escape a normalised phrase for use inside a Postgres regex alternation. */
export function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
