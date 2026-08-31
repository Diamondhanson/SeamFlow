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
// specialties. So: stable KEYS, with a label per supported language attached —
// the same pattern the measurement vocabulary already uses.
//
// West African garment names (agbada, kaba, boubou, dashiki, ankara, buba,
// wrapper) are NOT translated. They are the names of the garments, not
// descriptions of them, and inventing a Spanish or Swahili word for an agbada
// would make the taxonomy worse, not more accessible.
//
// Arabic is the exception to how that rule is APPLIED, not to the rule itself.
// Latin script inside an Arabic chip list forces a bidi break on every chip and
// reads as untranslated, so the same names are TRANSLITERATED into Arabic
// script rather than left in Latin. One is not a transliteration at all:
// `kaftan` is قفطان, an Arabic word English borrowed. These seven are the
// entries most worth putting in front of a native reviewer explicitly, rather
// than leaving buried among the rest.
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

/**
 * Languages the taxonomy carries a label for. Mirrors the apps' LanguageCode.
 * Widening this is a compile error on every entry below until each one is
 * translated, which is the point — a half-translated taxonomy silently shows
 * English to the people it was widened for.
 */
export type GarmentLang = 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';

export type GarmentTypeDef = {
  key: string;
  category: GarmentCategory;
} & Record<GarmentLang, string>;

export const GARMENT_CATEGORY_LABELS: Record<
  GarmentCategory,
  Record<GarmentLang, string>
> = {
  traditional: {
    en: 'Traditional & occasion',
    fr: 'Traditionnel et cérémonie',
    pt: 'Tradicional e cerimónia',
    es: 'Tradicional y de ceremonia',
    sw: 'Kiasili na sherehe',
    ar: 'تقليدي ومناسبات',
  },
  womens: {
    en: "Women's wear",
    fr: 'Vêtements femme',
    pt: 'Vestuário feminino',
    es: 'Ropa de mujer',
    sw: 'Mavazi ya wanawake',
    ar: 'ملابس نسائية',
  },
  mens: {
    en: "Men's tailoring",
    fr: 'Tailleur homme',
    pt: 'Alfaiataria masculina',
    es: 'Sastrería de hombre',
    sw: 'Ushonaji wa wanaume',
    ar: 'خياطة رجالية',
  },
  bridal: {
    en: 'Bridal & wedding',
    fr: 'Mariage',
    pt: 'Noivas e casamento',
    es: 'Novias y boda',
    sw: 'Bibi harusi na harusi',
    ar: 'أعراس',
  },
  kids: {
    en: 'Children',
    fr: 'Enfants',
    pt: 'Crianças',
    es: 'Niños',
    sw: 'Watoto',
    ar: 'أطفال',
  },
  other: {
    en: 'Other work',
    fr: 'Autres travaux',
    pt: 'Outros trabalhos',
    es: 'Otros trabajos',
    sw: 'Kazi nyingine',
    ar: 'أعمال أخرى',
  },
};

/**
 * The canonical list.
 *
 * Order within a category is roughly "most asked for first", because this is
 * rendered as a chip picker and the top of each group is what gets tapped.
 */
export const GARMENT_TYPES: GarmentTypeDef[] = [
  // ---- Traditional & occasion ---------------------------------------------
  { key: 'kaftan', category: 'traditional', en: 'Kaftan', fr: 'Caftan', pt: 'Cafetã', es: 'Caftán', sw: 'Kaftani', ar: 'قفطان' },
  { key: 'agbada', category: 'traditional', en: 'Agbada', fr: 'Agbada', pt: 'Agbada', es: 'Agbada', sw: 'Agbada', ar: 'أغبادا' },
  { key: 'senator', category: 'traditional', en: 'Senator', fr: 'Sénateur', pt: 'Senator', es: 'Senator', sw: 'Senator', ar: 'سيناتور' },
  { key: 'boubou', category: 'traditional', en: 'Boubou', fr: 'Boubou', pt: 'Boubou', es: 'Boubou', sw: 'Boubou', ar: 'بوبو' },
  { key: 'kaba', category: 'traditional', en: 'Kaba', fr: 'Kaba', pt: 'Kaba', es: 'Kaba', sw: 'Kaba', ar: 'كابا' },
  { key: 'dashiki', category: 'traditional', en: 'Dashiki', fr: 'Dashiki', pt: 'Dashiki', es: 'Dashiki', sw: 'Dashiki', ar: 'داشيكي' },
  { key: 'ankara_set', category: 'traditional', en: 'Ankara set', fr: 'Ensemble ankara', pt: 'Conjunto ankara', es: 'Conjunto ankara', sw: 'Seti ya ankara', ar: 'طقم أنكارا' },
  { key: 'buba_wrapper', category: 'traditional', en: 'Buba & wrapper', fr: 'Buba et pagne', pt: 'Buba e pano', es: 'Buba y wrapper', sw: 'Buba na wrapper', ar: 'بوبا وإزار' },

  // ---- Women's wear --------------------------------------------------------
  { key: 'gown', category: 'womens', en: 'Gown', fr: 'Robe longue', pt: 'Vestido comprido', es: 'Vestido largo', sw: 'Gauni refu', ar: 'فستان طويل' },
  { key: 'dress', category: 'womens', en: 'Dress', fr: 'Robe', pt: 'Vestido', es: 'Vestido', sw: 'Gauni', ar: 'فستان' },
  { key: 'skirt', category: 'womens', en: 'Skirt', fr: 'Jupe', pt: 'Saia', es: 'Falda', sw: 'Sketi', ar: 'تنورة' },
  { key: 'blouse', category: 'womens', en: 'Blouse', fr: 'Chemisier', pt: 'Blusa', es: 'Blusa', sw: 'Blauzi', ar: 'بلوزة' },
  { key: 'jumpsuit', category: 'womens', en: 'Jumpsuit', fr: 'Combinaison', pt: 'Macacão', es: 'Enterizo', sw: 'Ovaroli', ar: 'أفرول' },
  { key: 'two_piece_set', category: 'womens', en: 'Two-piece set', fr: 'Ensemble deux pièces', pt: 'Conjunto de duas peças', es: 'Conjunto de dos piezas', sw: 'Seti ya vipande viwili', ar: 'طقم من قطعتين' },
  { key: 'wrapper_set', category: 'womens', en: 'Wrapper set', fr: 'Ensemble pagne', pt: 'Conjunto de pano', es: 'Conjunto de wrapper', sw: 'Seti ya wrapper', ar: 'طقم إزار' },

  // ---- Men's tailoring -----------------------------------------------------
  { key: 'suit', category: 'mens', en: 'Suit', fr: 'Costume', pt: 'Fato', es: 'Traje', sw: 'Suti', ar: 'بدلة' },
  { key: 'blazer', category: 'mens', en: 'Blazer', fr: 'Blazer', pt: 'Blazer', es: 'Saco', sw: 'Blazer', ar: 'سترة' },
  { key: 'shirt', category: 'mens', en: 'Shirt', fr: 'Chemise', pt: 'Camisa', es: 'Camisa', sw: 'Shati', ar: 'قميص' },
  { key: 'trouser', category: 'mens', en: 'Trousers', fr: 'Pantalon', pt: 'Calças', es: 'Pantalón', sw: 'Suruali', ar: 'بنطال' },
  { key: 'waistcoat', category: 'mens', en: 'Waistcoat', fr: 'Gilet', pt: 'Colete', es: 'Chaleco', sw: 'Kizibao', ar: 'صديري' },

  // ---- Bridal & wedding ----------------------------------------------------
  { key: 'wedding_gown', category: 'bridal', en: 'Wedding gown', fr: 'Robe de mariée', pt: 'Vestido de noiva', es: 'Vestido de novia', sw: 'Gauni la harusi', ar: 'فستان زفاف' },
  { key: 'reception_dress', category: 'bridal', en: 'Reception dress', fr: 'Robe de réception', pt: 'Vestido de receção', es: 'Vestido de recepción', sw: 'Gauni la mapokezi', ar: 'فستان حفل' },
  { key: 'bridesmaid', category: 'bridal', en: 'Bridesmaid outfit', fr: 'Tenue de demoiselle d’honneur', pt: 'Traje de dama de honor', es: 'Vestido de dama de honor', sw: 'Vazi la msindikizaji', ar: 'فستان إشبينة' },
  { key: 'groom_outfit', category: 'bridal', en: 'Groom’s outfit', fr: 'Tenue du marié', pt: 'Traje do noivo', es: 'Traje del novio', sw: 'Vazi la bwana harusi', ar: 'بدلة العريس' },

  // ---- Children ------------------------------------------------------------
  { key: 'kids_outfit', category: 'kids', en: 'Children’s outfit', fr: 'Tenue enfant', pt: 'Roupa de criança', es: 'Ropa de niño', sw: 'Vazi la mtoto', ar: 'ملابس أطفال' },
  { key: 'school_uniform', category: 'kids', en: 'School uniform', fr: 'Uniforme scolaire', pt: 'Uniforme escolar', es: 'Uniforme escolar', sw: 'Sare ya shule', ar: 'زي مدرسي' },

  // ---- Other ---------------------------------------------------------------
  { key: 'work_uniform', category: 'other', en: 'Work uniform', fr: 'Tenue de travail', pt: 'Farda de trabalho', es: 'Uniforme de trabajo', sw: 'Sare ya kazi', ar: 'زي عمل' },
  { key: 'alteration', category: 'other', en: 'Alterations & repairs', fr: 'Retouches et réparations', pt: 'Arranjos e reparações', es: 'Arreglos y reparaciones', sw: 'Marekebisho na matengenezo', ar: 'تعديلات وإصلاحات' },
  { key: 'other', category: 'other', en: 'Something else', fr: 'Autre chose', pt: 'Outra coisa', es: 'Otra cosa', sw: 'Kitu kingine', ar: 'شيء آخر' },
];

export const GARMENT_KEYS = GARMENT_TYPES.map((g) => g.key);

/** A stored garment key. Kept as a plain string, not an enum: the list grows,
 *  and rows written last year must not fail validation when it does. */
export const GarmentKeySchema = z.string().min(1).max(40);

const BY_KEY = new Map(GARMENT_TYPES.map((g) => [g.key, g]));

export function garmentByKey(key: string | null | undefined): GarmentTypeDef | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/**
 * The label for a key in the given language, falling back to the raw value so
 * legacy free-text garment types still render as something readable.
 *
 * The `?? def.en` matters more than it looks: this package is consumed from
 * `dist`, so a caller compiled against a newer `GarmentLang` than the built
 * output can ask for a language the shipped table does not have. Without the
 * fallback that returns `undefined`, which React renders as nothing — a blank
 * chip on the specialties picker with no error anywhere.
 */
export function garmentLabel(key: string | null | undefined, lang: GarmentLang): string {
  if (!key) return '';
  const def = BY_KEY.get(key);
  if (!def) return key;
  return def[lang] ?? def.en;
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
