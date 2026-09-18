// ============================================================================
// The design vocabulary — colour and style, as stable keys.
//
// Same argument as the garment taxonomy next door, and the same evidence. Of
// the 38 designs published to the feed so far, ZERO carry a single tag, and
// `garment_type` has already fragmented into "dress" (13), "gown" (4), "set"
// (6), "cover-up" (1) and 4 rows of nothing. Every one of those was a free
// text box that a busy tailor skipped or filled differently from the last one.
//
// So the publish screen stops asking people to type. A model looks at the
// photo and proposes from THIS list; the tailor taps to correct it. That turns
// describing a design into a few taps instead of five empty fields, and it is
// the only reason the data below will ever be consistent enough to search.
//
// WHY KEYS AND NOT WORDS
//   A shopper types "robe", "gown", "dress" or فستان and means one thing. If
//   we store what they typed we can never join those; if we store a key we get
//   all six languages for free, because the label lives here and the row holds
//   `maxi`. The taxonomy IS the translation layer — that is what lets a French
//   search find an English-captioned design with no machine translation.
//
// KEYS ARE FOREVER — they land in feed_posts and tailor_works rows. Add
// freely, never rename. Labels can be reworded; keys cannot.
//
// COLOURS carry a hex anchor as well as a name. The anchor is what a palette
// extracted from the actual pixels snaps to (see nearestColorKey), so "the
// indigo one" and #2B3A67 end up as the same filter. Names are what people
// type; hexes are what the image gives us. We need both.
//
// TRANSLATION NOTE: the Swahili and Arabic style terms below are the entries
// most worth putting in front of a native reviewer. Fashion vocabulary is
// idiomatic and a literal translation of "peplum" or "boat neck" often is not
// what a speaker would actually say in a shop.
// ============================================================================

import { z } from 'zod';
import { PhotoQualitySchema } from './photo-quality';

/** Mirrors GarmentLang — widening either is a compile error until translated. */
export type DesignLang = 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';

type Labels = Record<DesignLang, string>;

// ── Colour ──────────────────────────────────────────────────────────────────

export type DesignColorDef = {
  key: string;
  /** Anchor an extracted pixel palette snaps to. Not a display value. */
  hex: string;
} & Labels;

/**
 * Deliberately a SHOP's colour list, not a designer's. Twenty names people
 * actually say out loud — no "ecru", no "puce". Gold and its neighbours are
 * over-represented on purpose: this market's occasion wear lives there.
 */
export const DESIGN_COLORS: DesignColorDef[] = [
  { key: 'black',  hex: '#111111', en: 'Black',  fr: 'Noir',       pt: 'Preto',    es: 'Negro',    sw: 'Nyeusi',        ar: 'أسود' },
  { key: 'white',  hex: '#F7F7F5', en: 'White',  fr: 'Blanc',      pt: 'Branco',   es: 'Blanco',   sw: 'Nyeupe',        ar: 'أبيض' },
  { key: 'cream',  hex: '#EFE3CB', en: 'Cream',  fr: 'Crème',      pt: 'Creme',    es: 'Crema',    sw: 'Krimu',         ar: 'كريمي' },
  { key: 'beige',  hex: '#D9C3A5', en: 'Beige',  fr: 'Beige',      pt: 'Bege',     es: 'Beige',    sw: 'Beji',          ar: 'بيج' },
  { key: 'brown',  hex: '#6B4A2F', en: 'Brown',  fr: 'Marron',     pt: 'Castanho', es: 'Marrón',   sw: 'Kahawia',       ar: 'بني' },
  { key: 'gold',   hex: '#C9A227', en: 'Gold',   fr: 'Doré',       pt: 'Dourado',  es: 'Dorado',   sw: 'Dhahabu',       ar: 'ذهبي' },
  { key: 'yellow', hex: '#E8C33A', en: 'Yellow', fr: 'Jaune',      pt: 'Amarelo',  es: 'Amarillo', sw: 'Njano',         ar: 'أصفر' },
  { key: 'orange', hex: '#DD7A32', en: 'Orange', fr: 'Orange',     pt: 'Laranja',  es: 'Naranja',  sw: 'Machungwa',     ar: 'برتقالي' },
  { key: 'red',    hex: '#C0392B', en: 'Red',    fr: 'Rouge',      pt: 'Vermelho', es: 'Rojo',     sw: 'Nyekundu',      ar: 'أحمر' },
  { key: 'burgundy', hex: '#7B1E3A', en: 'Burgundy', fr: 'Bordeaux', pt: 'Bordô', es: 'Burdeos', sw: 'Zambarau nyekundu', ar: 'عنابي' },
  { key: 'pink',   hex: '#E2879F', en: 'Pink',   fr: 'Rose',       pt: 'Rosa',     es: 'Rosa',     sw: 'Waridi',        ar: 'وردي' },
  { key: 'purple', hex: '#6B4E9B', en: 'Purple', fr: 'Violet',     pt: 'Roxo',     es: 'Morado',   sw: 'Zambarau',      ar: 'بنفسجي' },
  { key: 'blue',   hex: '#2E6FBF', en: 'Blue',   fr: 'Bleu',       pt: 'Azul',     es: 'Azul',     sw: 'Buluu',         ar: 'أزرق' },
  { key: 'navy',   hex: '#22314F', en: 'Navy',   fr: 'Bleu marine', pt: 'Azul-marinho', es: 'Azul marino', sw: 'Buluu iliyokolea', ar: 'كحلي' },
  { key: 'teal',   hex: '#2A8C8A', en: 'Teal',   fr: 'Bleu canard', pt: 'Azul-petróleo', es: 'Verde azulado', sw: 'Buluu ya kijani', ar: 'أزرق مخضر' },
  { key: 'green',  hex: '#3E8E5A', en: 'Green',  fr: 'Vert',       pt: 'Verde',    es: 'Verde',    sw: 'Kijani',        ar: 'أخضر' },
  { key: 'olive',  hex: '#6E7343', en: 'Olive',  fr: 'Olive',      pt: 'Verde-oliva', es: 'Verde oliva', sw: 'Kijani cha mzeituni', ar: 'زيتوني' },
  { key: 'grey',   hex: '#8A8D91', en: 'Grey',   fr: 'Gris',       pt: 'Cinzento', es: 'Gris',     sw: 'Kijivu',        ar: 'رمادي' },
  { key: 'silver', hex: '#C4C8CC', en: 'Silver', fr: 'Argenté',    pt: 'Prateado', es: 'Plateado', sw: 'Fedha',         ar: 'فضي' },
  { key: 'multicolour', hex: '#9B59B6', en: 'Multicolour', fr: 'Multicolore', pt: 'Multicolor', es: 'Multicolor', sw: 'Rangi nyingi', ar: 'متعدد الألوان' },
];

export const DESIGN_COLOR_KEYS = DESIGN_COLORS.map((c) => c.key);
export const DesignColorKeySchema = z.enum(
  DESIGN_COLOR_KEYS as [string, ...string[]],
);

// ── Style attributes ────────────────────────────────────────────────────────

export const AttributeGroupSchema = z.enum([
  'silhouette',
  'length',
  'sleeve',
  'neckline',
  'detail',
]);
export type AttributeGroup = z.infer<typeof AttributeGroupSchema>;

export const ATTRIBUTE_GROUP_LABELS: Record<AttributeGroup, Labels> = {
  silhouette: { en: 'Shape',    fr: 'Coupe',      pt: 'Forma',     es: 'Silueta',  sw: 'Umbo',      ar: 'القَصّة' },
  length:     { en: 'Length',   fr: 'Longueur',   pt: 'Comprimento', es: 'Largo',  sw: 'Urefu',     ar: 'الطول' },
  sleeve:     { en: 'Sleeves',  fr: 'Manches',    pt: 'Mangas',    es: 'Mangas',   sw: 'Mikono',    ar: 'الأكمام' },
  neckline:   { en: 'Neckline', fr: 'Encolure',   pt: 'Decote',    es: 'Escote',   sw: 'Shingo',    ar: 'فتحة الرقبة' },
  detail:     { en: 'Details',  fr: 'Détails',    pt: 'Detalhes',  es: 'Detalles', sw: 'Mapambo',   ar: 'التفاصيل' },
};

export type DesignAttributeDef = { key: string; group: AttributeGroup } & Labels;

/**
 * Groups where exactly one value can be true at once.
 *
 * A garment has one length and one neckline. Left unconstrained the model
 * cheerfully returned "sleeveless" AND "puff sleeve" for the same jacket,
 * which is not a description — it is two guesses printed next to each other.
 * `detail` is the deliberate exception: embroidered AND beaded AND belted is a
 * perfectly ordinary garment.
 */
export const EXCLUSIVE_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  'silhouette',
  'length',
  'sleeve',
  'neckline',
];

/**
 * Kept short on purpose. A vocabulary a tailor can scan in one screen gets
 * used; one with eighty entries gets a wrong tap or none at all. These are the
 * distinctions a shopper actually filters on.
 */
export const DESIGN_ATTRIBUTES: DesignAttributeDef[] = [
  // ---- Shape --------------------------------------------------------------
  { key: 'fitted',    group: 'silhouette', en: 'Fitted',     fr: 'Ajusté',      pt: 'Justo',       es: 'Ajustado',   sw: 'Inayobana',      ar: 'ضيّق' },
  { key: 'a_line',    group: 'silhouette', en: 'A-line',     fr: 'Trapèze',     pt: 'Evasê',       es: 'Corte en A', sw: 'Umbo la A',      ar: 'على شكل A' },
  { key: 'straight',  group: 'silhouette', en: 'Straight',   fr: 'Droit',       pt: 'Reto',        es: 'Recto',      sw: 'Nyooka',         ar: 'مستقيم' },
  { key: 'flared',    group: 'silhouette', en: 'Flared',     fr: 'Évasé',       pt: 'Rodado',      es: 'Acampanado', sw: 'Inayotanuka',    ar: 'واسع من الأسفل' },
  { key: 'oversized', group: 'silhouette', en: 'Oversized',  fr: 'Oversize',    pt: 'Oversize',    es: 'Oversize',   sw: 'Kubwa',          ar: 'فضفاض' },
  { key: 'wrap',      group: 'silhouette', en: 'Wrap',       fr: 'Portefeuille', pt: 'Transpassado', es: 'Cruzado', sw: 'Ya kujifunga',   ar: 'ملفوف' },
  { key: 'peplum',    group: 'silhouette', en: 'Peplum',     fr: 'Péplum',      pt: 'Peplum',      es: 'Peplum',     sw: 'Peplum',         ar: 'بيبلوم' },
  { key: 'mermaid',   group: 'silhouette', en: 'Mermaid',    fr: 'Sirène',      pt: 'Sereia',      es: 'Sirena',     sw: 'Nguva',          ar: 'حورية البحر' },
  { key: 'two_piece', group: 'silhouette', en: 'Two-piece',  fr: 'Deux pièces', pt: 'Duas peças',  es: 'Dos piezas', sw: 'Vipande viwili', ar: 'قطعتان' },

  // ---- Length -------------------------------------------------------------
  { key: 'cropped',   group: 'length', en: 'Cropped',     fr: 'Court',        pt: 'Curto',       es: 'Corto',        sw: 'Fupi sana',   ar: 'قصير' },
  { key: 'mini',      group: 'length', en: 'Mini',        fr: 'Mini',         pt: 'Mini',        es: 'Mini',         sw: 'Mini',        ar: 'قصير جداً' },
  { key: 'knee',      group: 'length', en: 'Knee-length', fr: 'Aux genoux',   pt: 'Até ao joelho', es: 'A la rodilla', sw: 'Hadi goti', ar: 'حتى الركبة' },
  { key: 'midi',      group: 'length', en: 'Midi',        fr: 'Midi',         pt: 'Midi',        es: 'Midi',         sw: 'Midi',        ar: 'متوسط' },
  { key: 'maxi',      group: 'length', en: 'Maxi',        fr: 'Maxi',         pt: 'Maxi',        es: 'Maxi',         sw: 'Ndefu',       ar: 'طويل' },
  { key: 'floor',     group: 'length', en: 'Floor-length', fr: 'Longueur sol', pt: 'Até ao chão', es: 'Hasta el suelo', sw: 'Hadi sakafu', ar: 'حتى الأرض' },

  // ---- Sleeves ------------------------------------------------------------
  { key: 'sleeveless',    group: 'sleeve', en: 'Sleeveless',    fr: 'Sans manches',    pt: 'Sem mangas',     es: 'Sin mangas',      sw: 'Bila mikono',     ar: 'بدون أكمام' },
  { key: 'short_sleeve',  group: 'sleeve', en: 'Short sleeve',  fr: 'Manches courtes', pt: 'Manga curta',    es: 'Manga corta',     sw: 'Mikono mifupi',   ar: 'كم قصير' },
  { key: 'three_quarter', group: 'sleeve', en: 'Three-quarter', fr: 'Manches 3/4',     pt: 'Manga 3/4',      es: 'Manga 3/4',       sw: 'Mikono ya robo tatu', ar: 'كم ثلاثة أرباع' },
  { key: 'long_sleeve',   group: 'sleeve', en: 'Long sleeve',   fr: 'Manches longues', pt: 'Manga comprida', es: 'Manga larga',     sw: 'Mikono mirefu',   ar: 'كم طويل' },
  { key: 'puff_sleeve',   group: 'sleeve', en: 'Puff sleeve',   fr: 'Manches ballon',  pt: 'Manga bufante',  es: 'Manga abullonada', sw: 'Mikono ya kuvimba', ar: 'كم منفوخ' },
  { key: 'bell_sleeve',   group: 'sleeve', en: 'Bell sleeve',   fr: 'Manches cloche',  pt: 'Manga sino',     es: 'Manga campana',   sw: 'Mikono ya kengele', ar: 'كم واسع' },
  { key: 'off_shoulder',  group: 'sleeve', en: 'Off-shoulder',  fr: 'Épaules dénudées', pt: 'Ombro a ombro', es: 'Hombros al aire', sw: 'Bila mabega',    ar: 'مكشوف الكتفين' },

  // ---- Neckline -----------------------------------------------------------
  { key: 'v_neck',     group: 'neckline', en: 'V-neck',      fr: 'Col V',          pt: 'Decote em V',   es: 'Cuello en V',   sw: 'Shingo ya V',    ar: 'رقبة V' },
  { key: 'round_neck', group: 'neckline', en: 'Round neck',  fr: 'Col rond',       pt: 'Decote redondo', es: 'Cuello redondo', sw: 'Shingo ya mviringo', ar: 'رقبة دائرية' },
  { key: 'square_neck', group: 'neckline', en: 'Square neck', fr: 'Col carré',     pt: 'Decote quadrado', es: 'Cuello cuadrado', sw: 'Shingo ya mraba', ar: 'رقبة مربعة' },
  { key: 'halter',     group: 'neckline', en: 'Halter',      fr: 'Dos nu',         pt: 'Frente única',  es: 'Halter',        sw: 'Halta',          ar: 'رقبة مربوطة' },
  { key: 'collared',   group: 'neckline', en: 'Collared',    fr: 'Avec col',       pt: 'Com gola',      es: 'Con cuello',    sw: 'Yenye kola',     ar: 'بياقة' },
  { key: 'strapless',  group: 'neckline', en: 'Strapless',   fr: 'Bustier',        pt: 'Tomara-que-caia', es: 'Palabra de honor', sw: 'Bila kamba', ar: 'بدون حمالات' },
  { key: 'boat_neck',  group: 'neckline', en: 'Boat neck',   fr: 'Col bateau',     pt: 'Decote barco',  es: 'Cuello barco',  sw: 'Shingo ya mashua', ar: 'رقبة قارب' },
  { key: 'high_neck',  group: 'neckline', en: 'High neck',   fr: 'Col montant',    pt: 'Gola alta',     es: 'Cuello alto',   sw: 'Shingo ndefu',   ar: 'رقبة عالية' },

  // ---- Details ------------------------------------------------------------
  { key: 'embroidered', group: 'detail', en: 'Embroidered', fr: 'Brodé',       pt: 'Bordado',     es: 'Bordado',     sw: 'Yenye nakshi',   ar: 'مطرّز' },
  { key: 'beaded',      group: 'detail', en: 'Beaded',      fr: 'Perlé',       pt: 'Com missangas', es: 'Con cuentas', sw: 'Yenye shanga', ar: 'مزيّن بالخرز' },
  { key: 'sequined',    group: 'detail', en: 'Sequined',    fr: 'À sequins',   pt: 'Com lantejoulas', es: 'Con lentejuelas', sw: 'Yenye sequins', ar: 'بالترتر' },
  { key: 'lace',        group: 'detail', en: 'Lace',        fr: 'Dentelle',    pt: 'Renda',       es: 'Encaje',      sw: 'Lesi',           ar: 'دانتيل' },
  { key: 'ruffles',     group: 'detail', en: 'Ruffles',     fr: 'Volants',     pt: 'Folhos',      es: 'Volantes',    sw: 'Mikunjo',        ar: 'كشكش' },
  { key: 'pleated',     group: 'detail', en: 'Pleated',     fr: 'Plissé',      pt: 'Pregas',      es: 'Plisado',     sw: 'Yenye mikunjo',  ar: 'مطوي' },
  { key: 'belted',      group: 'detail', en: 'Belted',      fr: 'Ceinturé',    pt: 'Com cinto',   es: 'Con cinturón', sw: 'Yenye mkanda',  ar: 'بحزام' },
  { key: 'pockets',     group: 'detail', en: 'Pockets',     fr: 'Poches',      pt: 'Bolsos',      es: 'Bolsillos',   sw: 'Mifuko',         ar: 'جيوب' },
  { key: 'hooded',      group: 'detail', en: 'Hooded',      fr: 'À capuche',   pt: 'Com capuz',   es: 'Con capucha', sw: 'Yenye kofia',    ar: 'بقلنسوة' },
  { key: 'printed',     group: 'detail', en: 'Printed',     fr: 'Imprimé',     pt: 'Estampado',   es: 'Estampado',   sw: 'Yenye michoro',  ar: 'مطبوع' },
  { key: 'plain',       group: 'detail', en: 'Plain',       fr: 'Uni',         pt: 'Liso',        es: 'Liso',        sw: 'Rahisi',         ar: 'سادة' },
  { key: 'sheer',       group: 'detail', en: 'Sheer panels', fr: 'Transparences', pt: 'Transparências', es: 'Transparencias', sw: 'Yenye uwazi', ar: 'شفاف' },
];

export const DESIGN_ATTRIBUTE_KEYS = DESIGN_ATTRIBUTES.map((a) => a.key);
export const DesignAttributeKeySchema = z.enum(
  DESIGN_ATTRIBUTE_KEYS as [string, ...string[]],
);

// ── Stored shapes ───────────────────────────────────────────────────────────

/**
 * One colour on a design. `share` is the fraction of the garment's pixels,
 * which is what makes "mostly red with gold trim" rankable — a 60% red beats
 * a 5% red when someone filters for red.
 */
export const DesignColorSchema = z.object({
  key: DesignColorKeySchema,
  /** The extracted pixel value this snapped to. Kept for a true swatch. */
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  share: z.number().min(0).max(1),
});
export type DesignColor = z.infer<typeof DesignColorSchema>;

/**
 * What the vision model proposes for a photo. Everything is optional and
 * everything is a suggestion — the tailor confirms before any of it is stored,
 * which is why nothing here is trusted enough to be required.
 */
export const DesignClassificationSchema = z.object({
  garmentKey: z.string().nullable(),
  audience: z.enum(['women', 'men', 'unisex', 'children']).nullable(),
  occasion: z.enum(['wedding', 'traditional', 'corporate', 'casual', 'party']).nullable(),
  fabric: z.string().max(80).nullable(),
  colors: z.array(DesignColorKeySchema).max(4),
  attributes: z.array(DesignAttributeKeySchema).max(10),
  title: z.string().max(60).nullable(),
  caption: z.string().max(280).nullable(),
  /**
   * How well the photo will show in the feed. Rides along on the same vision
   * call that classifies the garment, so it costs no extra request.
   */
  quality: PhotoQualitySchema,
});
export type DesignClassification = z.infer<typeof DesignClassificationSchema>;

// ── Lookups ─────────────────────────────────────────────────────────────────

const COLOR_BY_KEY = new Map(DESIGN_COLORS.map((c) => [c.key, c]));
const ATTR_BY_KEY = new Map(DESIGN_ATTRIBUTES.map((a) => [a.key, a]));

export function colorLabel(key: string, lang: DesignLang = 'en'): string {
  return COLOR_BY_KEY.get(key)?.[lang] ?? key;
}

export function colorHex(key: string): string | null {
  return COLOR_BY_KEY.get(key)?.hex ?? null;
}

export function attributeLabel(key: string, lang: DesignLang = 'en'): string {
  return ATTR_BY_KEY.get(key)?.[lang] ?? key;
}

export function attributesByGroup(): {
  group: AttributeGroup;
  items: DesignAttributeDef[];
}[] {
  const order: AttributeGroup[] = ['silhouette', 'length', 'sleeve', 'neckline', 'detail'];
  return order.map((group) => ({
    group,
    items: DESIGN_ATTRIBUTES.filter((a) => a.group === group),
  }));
}

/**
 * Snap an extracted pixel colour to the nearest vocabulary key.
 *
 * Distance is computed in a crude perceptual space — weighting red/green/blue
 * roughly by how much the eye cares — rather than raw RGB, because plain
 * Euclidean RGB puts navy closer to black than to blue and makes the filter
 * feel broken. Good enough for twenty buckets; not a colour-science library.
 */
export function nearestColorKey(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'multicolour';

  let best = DESIGN_COLORS[0]!;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const c of DESIGN_COLORS) {
    // The catch-all is a conclusion drawn from a whole palette, never the
    // nearest neighbour of a single swatch.
    if (c.key === 'multicolour') continue;
    const t = hexToRgb(c.hex);
    if (!t) continue;
    const rMean = (rgb.r + t.r) / 2;
    const dr = rgb.r - t.r;
    const dg = rgb.g - t.g;
    const db = rgb.b - t.b;
    const dist =
      (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best.key;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const ATTR_GROUP = new Map(DESIGN_ATTRIBUTES.map((a) => [a.key, a.group]));

/**
 * Keep a proposal internally consistent, whatever the model returned.
 *
 * Belt-and-braces beside the prompt: prompts drift, and a contradictory chip
 * set is worse than a sparse one because the tailor has to work out which of
 * two plausible chips to remove. First value wins in an exclusive group — the
 * model is asked to emit most-confident-first.
 */
export function normalizeAttributes(keys: string[]): string[] {
  const seen = new Set<AttributeGroup>();
  const out: string[] = [];
  for (const key of keys) {
    const group = ATTR_GROUP.get(key);
    if (!group) continue;
    if (EXCLUSIVE_ATTRIBUTE_GROUPS.includes(group)) {
      if (seen.has(group)) continue;
      seen.add(group);
    }
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * "Multicolour" is a statement that no single colour dominates, so it cannot
 * sit beside Green and Cream — that is three claims, one of which denies the
 * other two. When it arrives with company, the company is what is true.
 */
export function normalizeColorKeys(keys: string[]): string[] {
  const unique = [...new Set(keys.filter((k) => DESIGN_COLOR_KEYS.includes(k)))];
  const specific = unique.filter((k) => k !== 'multicolour');
  return specific.length ? specific : unique;
}
