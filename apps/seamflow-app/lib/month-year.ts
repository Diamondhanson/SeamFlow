// ============================================================================
// "March 2026", in the reader's language.
//
// Month names are bundled rather than taken from Intl because Intl's month
// formatting is unreliable under Hermes — it silently falls back to numbers or
// to English depending on the build, which is exactly the kind of bug nobody
// notices until a French tailor screenshots it.
//
// Used wherever a date is a MILESTONE rather than a deadline: when someone
// joined, when their shop was verified. Anything with a day in it (a delivery
// date, a fitting) belongs in a real date formatter, not here.
// ============================================================================

import type { LanguageCode } from './i18n';

const MONTHS: Record<LanguageCode, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  sw: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/** Empty string for a missing or unparseable date, so callers can just `||` it. */
export function formatMonthYear(iso: string | null | undefined, lang: LanguageCode): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}
