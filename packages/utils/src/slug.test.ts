import { describe, expect, it } from 'vitest';
import {
  SLUG_MAX_LENGTH,
  catalogueUrl,
  isReservedSlug,
  isValidSlugShape,
  slugifyBusinessName,
  withSlugSuffix,
} from './slug';

describe('slugifyBusinessName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyBusinessName('Mama Ngozi Couture')).toBe('mama-ngozi-couture');
  });

  it('folds diacritics instead of dropping the letter', () => {
    // The point of folding: someone can retype this off a shop sign.
    expect(slugifyBusinessName('Atelier Ngözi')).toBe('atelier-ngozi');
    expect(slugifyBusinessName('Élégance Créations')).toBe('elegance-creations');
  });

  it('handles ligatures NFD leaves alone', () => {
    expect(slugifyBusinessName('Cœur Couture')).toBe('coeur-couture');
    expect(slugifyBusinessName('Straße Mode')).toBe('strasse-mode');
  });

  it('deletes apostrophes rather than splitting on them', () => {
    expect(slugifyBusinessName("L'Atelier")).toBe('latelier');
    expect(slugifyBusinessName('L’Atelier')).toBe('latelier');
  });

  it('collapses punctuation and runs of separators', () => {
    expect(slugifyBusinessName('Sew  &  Style!!')).toBe('sew-style');
    expect(slugifyBusinessName('  --Bespoke--  ')).toBe('bespoke');
  });

  it('never returns a trailing hyphen when truncating', () => {
    const long = 'Atelier de la Haute Couture Traditionnelle Africaine';
    const slug = slugifyBusinessName(long);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
    expect(isValidSlugShape(slug)).toBe(true);
  });

  it('returns empty when nothing usable survives, rather than guessing', () => {
    // Callers must fall back; they must not assume a non-empty result.
    expect(slugifyBusinessName('日本語')).toBe('');
    expect(slugifyBusinessName('!!!')).toBe('');
  });
});

describe('isValidSlugShape', () => {
  it('accepts the shapes the DB constraint accepts', () => {
    expect(isValidSlugShape('mama-ngozi-couture')).toBe(true);
    expect(isValidSlugShape('a1b')).toBe(true);
  });

  it('rejects too-short, edge-hyphen, doubled-hyphen and uppercase', () => {
    expect(isValidSlugShape('ab')).toBe(false);
    expect(isValidSlugShape('-abc')).toBe(false);
    expect(isValidSlugShape('abc-')).toBe(false);
    expect(isValidSlugShape('a--b')).toBe(false);
    expect(isValidSlugShape('Abc')).toBe(false);
    expect(isValidSlugShape('a'.repeat(SLUG_MAX_LENGTH + 1))).toBe(false);
  });
});

describe('isReservedSlug', () => {
  it('catches reserved words case-insensitively', () => {
    expect(isReservedSlug('support')).toBe(true);
    expect(isReservedSlug('Support')).toBe(true);
    expect(isReservedSlug('mama-ngozi-couture')).toBe(false);
  });
});

describe('withSlugSuffix', () => {
  it('appends the suffix', () => {
    expect(withSlugSuffix('mama-ngozi', 2)).toBe('mama-ngozi-2');
  });

  it('trims the base, never the suffix, to stay within the limit', () => {
    const base = 'a'.repeat(SLUG_MAX_LENGTH);
    const out = withSlugSuffix(base, 12);
    expect(out.length).toBe(SLUG_MAX_LENGTH);
    expect(out.endsWith('-12')).toBe(true);
    expect(isValidSlugShape(out)).toBe(true);
  });

  it('does not leave a doubled hyphen when the base ends mid-separator', () => {
    const out = withSlugSuffix('atelier-de-', 3);
    expect(out).toBe('atelier-de-3');
    expect(isValidSlugShape(out)).toBe(true);
  });
});

describe('catalogueUrl', () => {
  it('builds the /t/<slug> URL', () => {
    expect(catalogueUrl('https://www.seamflowtech.com', 'mama-ngozi')).toBe(
      'https://www.seamflowtech.com/t/mama-ngozi',
    );
  });

  it('tolerates a trailing slash on the base', () => {
    expect(catalogueUrl('https://www.seamflowtech.com/', 'mama-ngozi')).toBe(
      'https://www.seamflowtech.com/t/mama-ngozi',
    );
  });
});
