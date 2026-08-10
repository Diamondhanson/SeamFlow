// ============================================================================
// Measurement helpers for the template builder.
//
// A template field has a `key` (the stable property name the value is stored
// under, e.g. on an order's measurements) and a `label` (display text). The
// tailor only ever types/taps ONE thing — the measurement name — and we use it
// as both: `key` is derived from the name at save time (deduped), and the name
// is the label. No separate "key" input.
//
// The quick-add palette below covers the common measurements (grouped by body
// region) so building a template is mostly tapping. Names are localized via the
// `measurements.*` i18n namespace.
// ============================================================================

import type { TemplateField } from '@seamflow/schemas';
import { measurements as measurementNames } from './i18n/locales/measurements';

/** What the field editor works with — the tailor edits a name + toggles.
 *  `lowConfidence` is set on fields pre-filled from a photo scan the AI
 *  wasn't sure about — display-only, dropped at save time. */
export interface EditableField {
  label: string;
  required?: boolean;
  unit?: 'cm' | 'in';
  lowConfidence?: boolean;
}

/**
 * Turn the editor's fields into persistable `TemplateField[]`: trim, drop
 * empties, and derive a unique `key` from each name (case-insensitive dedup).
 * The name is kept human-readable as the key because it's what shows on the
 * order + client-facing pages once measurements are saved.
 */
export function finalizeTemplateFields(fields: EditableField[]): TemplateField[] {
  const used = new Set<string>();
  const out: TemplateField[] = [];
  for (const f of fields) {
    const label = f.label.trim().replace(/\s+/g, ' ');
    if (!label) continue;
    let key = label;
    let n = 2;
    while (used.has(key.toLowerCase())) {
      key = `${label} ${n++}`;
    }
    used.add(key.toLowerCase());
    out.push({ key, label, required: f.required, unit: f.unit ?? 'cm' });
  }
  return out;
}

/**
 * Quick-add palette — grouped common measurements. Each entry is an i18n key in
 * the `measurements.*` namespace; the displayed (and stored) name comes from
 * `t()`, so a French tailor gets French names. Grouped by body region so the
 * palette scans quickly.
 */
export interface MeasurementGroup {
  /** i18n key (templates.*) for the group heading. */
  titleKey: string;
  /** i18n keys (measurements.*) for each measurement in the group. */
  keys: string[];
}

// ============================================================================
// Label matching — normalize a label read off a scanned photo onto the app's
// measurement vocabulary, so scanned templates stay consistent with hand-built
// ones ("Poitrine" / "Chest" / "tour de poitrine" all collapse onto the
// tailor's localized "Chest"). A miss keeps the raw label as-is — an unmatched
// row is a fine outcome, not an error. Client-side on purpose: the app owns
// the i18n dictionary and the active locale; the API returns what it read.
// ============================================================================

/** Common variants/abbreviations the en/fr vocabulary doesn't cover verbatim.
 *  Keys are matched after `normalizeScannedLabel` (lowercased, accents and
 *  punctuation stripped), values are `measurements.*` i18n keys. */
const LABEL_SYNONYMS: Record<string, string> = {
  // English variants
  shoulders: 'shoulder',
  hip: 'hips',
  seat: 'hips',
  burst: 'bust', // common sheet misspelling
  sleeve: 'sleeveLength',
  'long sleeve': 'sleeveLength',
  'sleeve lenght': 'sleeveLength', // common sheet misspelling
  'round sleeve': 'roundArm',
  lap: 'thigh', // common West African usage
  trouser: 'trouserLength',
  'trousers length': 'trouserLength',
  top: 'topLength',
  'head size': 'head',
  'cap size': 'cap',
  // French variants
  'tour de poitrine': 'chest',
  'tour de taille': 'waist',
  'tour de hanche': 'hips',
  'tour de hanches': 'hips',
  'tour de cou': 'neck',
  epaule: 'shoulder',
  epaules: 'shoulder',
  hanche: 'hips',
  manche: 'sleeveLength',
  'longueur manche': 'sleeveLength',
  'longueur des manches': 'sleeveLength',
  'longueur pantalon': 'trouserLength',
  cuisses: 'thigh',
  genoux: 'knee',
};

/** Lowercase, strip accents + punctuation, collapse whitespace. */
function normalizeScannedLabel(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// normalized label (en + fr + synonyms) → measurements.* key. Built once.
let labelLookup: Map<string, string> | null = null;
function getLabelLookup(): Map<string, string> {
  if (labelLookup) return labelLookup;
  const map = new Map<string, string>();
  for (const group of MEASUREMENT_GROUPS) {
    for (const mkey of group.keys) {
      for (const lang of ['en', 'fr'] as const) {
        const name = (measurementNames[lang] as Record<string, string>)[mkey];
        if (name) map.set(normalizeScannedLabel(name), mkey);
      }
    }
  }
  for (const [syn, mkey] of Object.entries(LABEL_SYNONYMS)) {
    map.set(normalizeScannedLabel(syn), mkey);
  }
  labelLookup = map;
  return map;
}

/**
 * Tidy a stored measurement key for display. Keys come from templates or from
 * scanned sheets, so they can carry the paper form's shorthand and shouting:
 *
 *   "B / ROUND HIPS"        → "Round hips"
 *   "LT DOS / HALF LENGTH"  → "Half length"
 *   "chest"                 → "Chest"
 *
 * The stored key is never changed — this is presentation only, so existing
 * measurement sets keep working.
 */
export function prettyMeasurementLabel(key: string): string {
  // Drop a leading abbreviation code ("B /", "LT DOS /", "HBP /") — short,
  // all-caps/punctuation shorthand before a slash, never a real word phrase.
  let label = key.trim();
  const slash = label.indexOf('/');
  if (slash > 0 && slash <= 8) {
    const prefix = label.slice(0, slash).trim();
    if (/^[A-Z0-9.\s]{1,8}$/.test(prefix)) label = label.slice(slash + 1).trim();
  }
  label = label.replace(/\s+/g, ' ');
  if (!label) return key.trim();
  // De-shout ALL-CAPS scans; leave mixed-case labels (tailor's own wording)
  // exactly as written.
  if (label === label.toUpperCase() && /[A-Z]{2,}/.test(label)) {
    label = label.toLowerCase();
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Match a raw scanned label against the vocabulary. On a hit, returns the
 * tailor's localized canonical name (via the caller's `t`); on a miss, the
 * cleaned-up raw label — never dropped, the tailor can rename it.
 */
export function matchMeasurementLabel(
  raw: string,
  t: (key: string) => string,
): { label: string; matched: boolean } {
  // Strip the paper form's shorthand code ("B / ROUND HIPS") and de-shout
  // before matching — both so the vocabulary lookup can hit, and so an
  // unmatched label is still stored readably.
  const cleaned = prettyMeasurementLabel(raw);
  const norm = normalizeScannedLabel(cleaned);
  const mkey = norm ? getLabelLookup().get(norm) : undefined;
  if (!mkey) return { label: cleaned, matched: false };
  return { label: t('measurements.' + mkey), matched: true };
}

/**
 * The handful a tailor reaches for on almost every order.
 *
 * The full grouped palette lives in MEASUREMENT_GROUPS and belongs on the
 * template editor, where building a complete sheet is the whole job. Inside the
 * new-order flow it would bury the step, so the order screen offers these as
 * one-tap chips and lets anything else be typed by hand.
 */
export const QUICK_MEASUREMENT_KEYS = [
  'shoulder',
  'chest',
  'waist',
  'hips',
  'sleeveLength',
  'topLength',
  'trouserLength',
  'neck',
] as const;

export const MEASUREMENT_GROUPS: MeasurementGroup[] = [
  {
    titleKey: 'templates.groupUpperBody',
    keys: [
      'neck',
      'collar',
      'shoulder',
      'chest',
      'bust',
      'underBust',
      'bustPoint',
      'apexToApex',
      'waist',
      'upperWaist',
      'hips',
      'highHip',
      'backWidth',
      'frontWidth',
      'acrossBack',
      'acrossFront',
      'armhole',
      'roundArm',
      'bicep',
      'elbow',
      'wrist',
      'cuff',
      'sleeveLength',
      'shortSleeve',
      'shoulderToWaist',
      'napeToWaist',
    ],
  },
  {
    titleKey: 'templates.groupLengths',
    keys: [
      'topLength',
      'blouseLength',
      'shirtLength',
      'dressLength',
      'gownLength',
      'kaftanLength',
      'agbadaLength',
      'jacketLength',
      'skirtLength',
      'fullLength',
      'kneeLength',
      'ankleLength',
    ],
  },
  {
    titleKey: 'templates.groupLowerBody',
    keys: [
      'thigh',
      'knee',
      'calf',
      'ankle',
      'trouserLength',
      'outseam',
      'inseam',
      'rise',
      'crotch',
      'hem',
      'roundBottom',
    ],
  },
  {
    titleKey: 'templates.groupOther',
    keys: ['head', 'cap', 'gele'],
  },
];
