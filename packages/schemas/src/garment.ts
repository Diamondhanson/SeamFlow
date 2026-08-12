// ============================================================================
// The garment vocabulary — one canonical list, used everywhere.
//
// Matching only works if both sides describe a garment in the SAME words. A
// client asking for a "kaftan" and a tailor whose speciality says "Caftan" do
// not find each other, and today the app stores whatever anyone typed:
//
//   order items:  Caftan · kaftan · Gown · Party gown · Two piece suit · garment
//   templates:    "all garments. " · "any" · "all types" · trouser
//
// That is free text drifting apart, and it is why 0 of 9 tailors have usable
// specialties. So: stable KEYS, with EN + FR labels attached — the same pattern
// the measurement vocabulary already uses.
//
// WHAT READS THIS
//   · tailor specialties        (what I make)
//   · measurement templates     (garmentType)
//   · feed posts                (garment_type)
//   · group orders + members    (garment_type)
//   · requests + offers         (ROADMAP appendix H — matching depends on it)
//
// KEYS ARE FOREVER. A label can be reworded and a category can be reshuffled,
// but a key is written into rows across five tables; changing one silently
// orphans data. Add new keys freely, never rename an old one.
//
// The list leans deliberately towards the West/Central African market this app
// serves — agbada, kaba, boubou and senator matter here in a way that a generic
// "dress / shirt / trousers" list would quietly erase.
// ============================================================================

import { z } from 'zod';

export const GarmentCategorySchema = z.enum([
  'traditional',
  'womens',
  'mens',
  'bridal',
  'kids',
  'other',
]);
export type GarmentCategory = z.infer<typeof GarmentCategorySchema>;

export interface GarmentTypeDef {
  key: string;
  category: GarmentCategory;
  en: string;
  fr: string;
}

export const GARMENT_CATEGORY_LABELS: Record<GarmentCategory, { en: string; fr: string }> = {
  traditional: { en: 'Traditional & occasion', fr: 'Traditionnel et cérémonie' },
  womens: { en: "Women's wear", fr: 'Vêtements femme' },
  mens: { en: "Men's tailoring", fr: 'Tailleur homme' },
  bridal: { en: 'Bridal & wedding', fr: 'Mariage' },
  kids: { en: 'Children', fr: 'Enfants' },
  other: { en: 'Other work', fr: 'Autres travaux' },
};

/**
 * The canonical list.
 *
 * Order within a category is roughly "most asked for first", because this is
 * rendered as a chip picker and the top of each group is what gets tapped.
 */
export const GARMENT_TYPES: GarmentTypeDef[] = [
  // ---- Traditional & occasion ---------------------------------------------
  { key: 'kaftan', category: 'traditional', en: 'Kaftan', fr: 'Caftan' },
  { key: 'agbada', category: 'traditional', en: 'Agbada', fr: 'Agbada' },
  { key: 'senator', category: 'traditional', en: 'Senator', fr: 'Sénateur' },
  { key: 'boubou', category: 'traditional', en: 'Boubou', fr: 'Boubou' },
  { key: 'kaba', category: 'traditional', en: 'Kaba', fr: 'Kaba' },
  { key: 'dashiki', category: 'traditional', en: 'Dashiki', fr: 'Dashiki' },
  { key: 'ankara_set', category: 'traditional', en: 'Ankara set', fr: 'Ensemble ankara' },
  { key: 'buba_wrapper', category: 'traditional', en: 'Buba & wrapper', fr: 'Buba et pagne' },

  // ---- Women's wear --------------------------------------------------------
  { key: 'gown', category: 'womens', en: 'Gown', fr: 'Robe longue' },
  { key: 'dress', category: 'womens', en: 'Dress', fr: 'Robe' },
  { key: 'skirt', category: 'womens', en: 'Skirt', fr: 'Jupe' },
  { key: 'blouse', category: 'womens', en: 'Blouse', fr: 'Chemisier' },
  { key: 'jumpsuit', category: 'womens', en: 'Jumpsuit', fr: 'Combinaison' },
  { key: 'two_piece_set', category: 'womens', en: 'Two-piece set', fr: 'Ensemble deux pièces' },
  { key: 'wrapper_set', category: 'womens', en: 'Wrapper set', fr: 'Ensemble pagne' },

  // ---- Men's tailoring -----------------------------------------------------
  { key: 'suit', category: 'mens', en: 'Suit', fr: 'Costume' },
  { key: 'blazer', category: 'mens', en: 'Blazer', fr: 'Blazer' },
  { key: 'shirt', category: 'mens', en: 'Shirt', fr: 'Chemise' },
  { key: 'trouser', category: 'mens', en: 'Trousers', fr: 'Pantalon' },
  { key: 'waistcoat', category: 'mens', en: 'Waistcoat', fr: 'Gilet' },

  // ---- Bridal & wedding ----------------------------------------------------
  { key: 'wedding_gown', category: 'bridal', en: 'Wedding gown', fr: 'Robe de mariée' },
  { key: 'reception_dress', category: 'bridal', en: 'Reception dress', fr: 'Robe de réception' },
  { key: 'bridesmaid', category: 'bridal', en: 'Bridesmaid outfit', fr: 'Tenue de demoiselle d’honneur' },
  { key: 'groom_outfit', category: 'bridal', en: 'Groom’s outfit', fr: 'Tenue du marié' },

  // ---- Children ------------------------------------------------------------
  { key: 'kids_outfit', category: 'kids', en: 'Children’s outfit', fr: 'Tenue enfant' },
  { key: 'school_uniform', category: 'kids', en: 'School uniform', fr: 'Uniforme scolaire' },

  // ---- Other ---------------------------------------------------------------
  { key: 'work_uniform', category: 'other', en: 'Work uniform', fr: 'Tenue de travail' },
  { key: 'alteration', category: 'other', en: 'Alterations & repairs', fr: 'Retouches et réparations' },
  { key: 'other', category: 'other', en: 'Something else', fr: 'Autre chose' },
];

export const GARMENT_KEYS = GARMENT_TYPES.map((g) => g.key);

/** A stored garment key. Kept as a plain string, not an enum: the list grows,
 *  and rows written last year must not fail validation when it does. */
export const GarmentKeySchema = z.string().min(1).max(40);

const BY_KEY = new Map(GARMENT_TYPES.map((g) => [g.key, g]));

export function garmentByKey(key: string | null | undefined): GarmentTypeDef | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** The label for a key in the given language, falling back to the raw value so
 *  legacy free-text garment types still render as something readable. */
export function garmentLabel(key: string | null | undefined, lang: 'en' | 'fr'): string {
  if (!key) return '';
  const def = BY_KEY.get(key);
  return def ? def[lang] : key;
}

export function garmentsByCategory(): { category: GarmentCategory; items: GarmentTypeDef[] }[] {
  return GarmentCategorySchema.options.map((category) => ({
    category,
    items: GARMENT_TYPES.filter((g) => g.category === category),
  }));
}

/**
 * Best-effort mapping of legacy free text onto a key.
 *
 * Every garment_type written before this file existed is whatever someone
 * typed — "Caftan", "Party gown", "Two piece suit", "all garments. ". This
 * makes those rows searchable without a migration that would have to guess and
 * could guess wrong: matching stays advisory, and the original text is never
 * overwritten.
 *
 * Returns null rather than a bad guess. A wrong key is worse than no key —
 * it puts a tailor in front of work they do not do.
 */
export function normalizeGarmentKey(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  // Exact key, or an exact EN/FR label.
  if (BY_KEY.has(cleaned)) return cleaned;
  for (const g of GARMENT_TYPES) {
    if (g.en.toLowerCase() === cleaned || g.fr.toLowerCase() === cleaned) return g.key;
  }

  // Common spellings and phrasings seen in the existing data. Deliberately a
  // short, explicit list rather than fuzzy matching — "all garments" must map
  // to nothing, and a similarity score would happily match it to something.
  const ALIASES: Record<string, string> = {
    caftan: 'kaftan',
    kaftans: 'kaftan',
    'party gown': 'gown',
    'long gown': 'gown',
    gowns: 'gown',
    'two piece': 'two_piece_set',
    'two piece set': 'two_piece_set',
    'two piece suit': 'suit',
    'three piece suit': 'suit',
    suits: 'suit',
    trousers: 'trouser',
    pant: 'trouser',
    pants: 'trouser',
    shirts: 'shirt',
    dresses: 'dress',
    skirts: 'skirt',
    'wedding dress': 'wedding_gown',
    'bridal gown': 'wedding_gown',
    uniform: 'work_uniform',
    uniforms: 'work_uniform',
    alterations: 'alteration',
    repair: 'alteration',
    repairs: 'alteration',
  };
  return ALIASES[cleaned] ?? null;
}
