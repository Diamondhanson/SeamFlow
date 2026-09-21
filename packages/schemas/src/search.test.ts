// Every case here is a query measured against the live feed before this module
// existed, or a way the obvious fix would have gone wrong.

import { describe, expect, it } from 'vitest';
import { normalizeForSearch, parseSearchQuery } from './search';

describe('normalizeForSearch', () => {
  it('strips accents the way Postgres unaccent does', () => {
    expect(normalizeForSearch('Robe de Mariée')).toBe('robe de mariee');
  });

  it('keeps Arabic letters instead of deleting them', () => {
    // A naive [a-z] filter turns an Arabic query into an empty string.
    expect(normalizeForSearch('فستان')).toBe('فستان');
  });

  it('turns punctuation into spaces', () => {
    expect(normalizeForSearch('Buba & wrapper!')).toBe('buba wrapper');
  });
});

describe('parseSearchQuery', () => {
  it('resolves a French garment word to the garment it names', () => {
    // Previously 0 results.
    const { concepts } = parseSearchQuery('robe');
    expect(concepts).toHaveLength(1);
    expect(concepts[0]!.garmentKeys).toContain('dress');
  });

  it('lets "robe" alone reach the whole family, including wedding gowns', () => {
    const { concepts } = parseSearchQuery('robe');
    expect(concepts[0]!.garmentKeys).toContain('wedding_gown');
  });

  it('keeps a multi-word label as ONE concept', () => {
    // Otherwise "robe de mariée" becomes "robe" AND "mariée" and gets stricter,
    // not more precise.
    const { concepts, terms } = parseSearchQuery('robe de mariée');
    expect(concepts).toHaveLength(1);
    expect(concepts[0]!.garmentKeys).toEqual(['wedding_gown']);
    expect(terms).toEqual([]);
  });

  it('works without accents typed', () => {
    expect(parseSearchQuery('robe de mariee').concepts[0]!.garmentKeys).toEqual(['wedding_gown']);
  });

  it('resolves colours in French to the same key as English', () => {
    // "rouge" was 0 results; "red" matched the wrong six.
    expect(parseSearchQuery('rouge').concepts[0]!.colorKeys).toEqual(['red']);
    expect(parseSearchQuery('red').concepts[0]!.colorKeys).toEqual(['red']);
  });

  it('carries every translation so legacy English captions are reachable from French', () => {
    // The 38 existing posts have no colour keys at all — only captions and
    // titles. "vert" can only find "Green Two-Piece" through the translation.
    const { phrases } = parseSearchQuery('vert').concepts[0]!;
    expect(phrases).toContain('green');
    expect(phrases).toContain('vert');
  });

  it('splits "red kaftan" into two concepts that must both hold', () => {
    const { concepts } = parseSearchQuery('red kaftan');
    const kinds = concepts.map((c) =>
      c.colorKeys.length ? 'color' : c.garmentKeys.length ? 'garment' : '?',
    );
    expect(kinds.sort()).toEqual(['color', 'garment']);
  });

  it('never matches a three-letter word as a fragment of a longer one', () => {
    // The original bug: "red" hit embroide-RED and structu-RED. A 3-letter word
    // must equal a whole label word, not merely start one.
    const { concepts } = parseSearchQuery('red');
    expect(concepts).toHaveLength(1);
    expect(concepts[0]!.garmentKeys).toEqual([]);
    expect(concepts[0]!.attributeKeys).toEqual([]);
  });

  it('keeps unknown words as plain terms rather than throwing them away', () => {
    const { concepts, terms } = parseSearchQuery('douala');
    expect(concepts).toEqual([]);
    expect(terms).toEqual(['douala']);
  });

  it('drops glue words from plain terms', () => {
    expect(parseSearchQuery('something for the weekend').terms).toEqual([
      'something',
      'weekend',
    ]);
  });

  it('understands a style attribute in either language', () => {
    expect(parseSearchQuery('long sleeve').concepts[0]!.attributeKeys).toContain('long_sleeve');
    expect(parseSearchQuery('manches longues').concepts[0]!.attributeKeys).toContain(
      'long_sleeve',
    );
  });

  it('returns nothing to match for an empty or glue-only query', () => {
    expect(parseSearchQuery('   ')).toEqual({ concepts: [], terms: [] });
    expect(parseSearchQuery('de la')).toEqual({ concepts: [], terms: [] });
  });
});
