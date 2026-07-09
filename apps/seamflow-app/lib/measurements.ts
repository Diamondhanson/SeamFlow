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

/** What the field editor works with — the tailor edits a name + toggles. */
export interface EditableField {
  label: string;
  required?: boolean;
  unit?: 'cm' | 'in';
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
