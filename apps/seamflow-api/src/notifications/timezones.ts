// Country (ISO 3166-1 alpha-2) → a representative IANA timezone. Used to derive
// a tailor's timezone when they haven't set one explicitly. Countries that span
// multiple zones map to their most populous / capital zone — a tailor can
// override in Settings if it's wrong.
const COUNTRY_TIMEZONE: Record<string, string> = {
  CM: 'Africa/Douala',
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  CI: 'Africa/Abidjan',
  SN: 'Africa/Dakar',
  KE: 'Africa/Nairobi',
  TZ: 'Africa/Dar_es_Salaam',
  UG: 'Africa/Kampala',
  ET: 'Africa/Addis_Ababa',
  ZA: 'Africa/Johannesburg',
  EG: 'Africa/Cairo',
  MA: 'Africa/Casablanca',
  DZ: 'Africa/Algiers',
  TN: 'Africa/Tunis',
  RW: 'Africa/Kigali',
  CD: 'Africa/Kinshasa',
  GA: 'Africa/Libreville',
  TG: 'Africa/Lome',
  BJ: 'Africa/Porto-Novo',
  BF: 'Africa/Ouagadougou',
  ML: 'Africa/Bamako',
  ZM: 'Africa/Lusaka',
  ZW: 'Africa/Harare',
  AO: 'Africa/Luanda',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  US: 'America/New_York',
  CA: 'America/Toronto',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  PH: 'Asia/Manila',
  BR: 'America/Sao_Paulo',
};

/** Resolve a tailor's timezone: explicit override → country default → UTC. */
export function resolveTimezone(
  explicit: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  if (explicit) return explicit;
  if (countryCode && COUNTRY_TIMEZONE[countryCode.toUpperCase()]) {
    return COUNTRY_TIMEZONE[countryCode.toUpperCase()];
  }
  return 'UTC';
}

/** Current wall-clock hour (0–23) in a timezone. */
export function hourInTimezone(tz: string, now = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false,
    }).format(now);
    return parseInt(h, 10) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/** Whole-day difference (dueDate − today) evaluated in a timezone. */
export function daysUntilInTimezone(
  due: string | Date,
  tz: string,
  now = new Date(),
): number {
  const ymd = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // 'YYYY-MM-DD'
  const toUTCDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const today = toUTCDate(ymd(now));
  const dueDay = toUTCDate(ymd(new Date(due)));
  return Math.round((dueDay - today) / 86_400_000);
}
