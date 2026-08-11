export function formatCurrency(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

// ISO 3166-1 alpha-2 country → ISO 4217 currency. Used to default a tailor's
// currency from their country (they can still override). Covers our target
// markets + common ones; unknown countries fall back to USD.
const COUNTRY_CURRENCY: Record<string, string> = {
  CM: 'XAF', // Cameroon
  CF: 'XAF',
  TD: 'XAF',
  CG: 'XAF',
  GA: 'XAF',
  GQ: 'XAF',
  BJ: 'XOF',
  BF: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  NE: 'XOF',
  SN: 'XOF',
  TG: 'XOF',
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  TZ: 'TZS',
  UG: 'UGX',
  RW: 'RWF',
  ET: 'ETB',
  ZA: 'ZAR',
  ZM: 'ZMW',
  ZW: 'ZWL',
  AO: 'AOA',
  CD: 'CDF',
  EG: 'EGP',
  MA: 'MAD',
  DZ: 'DZD',
  TN: 'TND',
  GB: 'GBP',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  BE: 'EUR',
  US: 'USD',
  CA: 'CAD',
  IN: 'INR',
  PK: 'PKR',
  AE: 'AED',
  SA: 'SAR',
  PH: 'PHP',
  BR: 'BRL',
};

/** Default ISO 4217 currency for a country (ISO alpha-2). Falls back to USD. */
export function currencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return 'USD';
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'USD';
}

// ----------------------------------------------------------------------------
// Minor units — how many decimal places a currency actually has.
//
// Money code used to round everything to 2dp. That is wrong for roughly a third
// of the world: XAF and XOF (this product's home markets), RWF, UGX and JPY
// have NO minor unit, and TND has three. Rounding XAF to 2dp stores 999.90 and
// prints "FCFA 1,000" — a stored figure that is not the figure on the bill.
//
// Derived from Intl rather than a hand-kept table, so it follows the ISO 4217
// data the platform already ships and cannot drift out of date. Cached because
// constructing a NumberFormat is not free and line totals recompute on every
// keystroke.
// ----------------------------------------------------------------------------

const MINOR_UNITS = new Map<string, number>();

/** Decimal places for a currency. Falls back to 2 when unknown or unset. */
export function currencyDecimals(currency: string | null | undefined): number {
  if (!currency) return 2;
  const key = currency.toUpperCase();
  const cached = MINOR_UNITS.get(key);
  if (cached !== undefined) return cached;

  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat('en-US', { style: 'currency', currency: key })
        .resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Unknown/invalid code — 2dp is the safe generic default.
    digits = 2;
  }
  MINOR_UNITS.set(key, digits);
  return digits;
}

/**
 * Round an amount to its currency's smallest real unit.
 *
 * `+ Number.EPSILON` fixes the classic 1.005 case that binary floats would
 * otherwise round down. Passing no currency keeps the old 2dp behaviour, so
 * call sites that genuinely have no currency are unchanged.
 */
export function roundToCurrency(n: number, currency?: string | null): number {
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** currencyDecimals(currency);
  return Math.round((n + Number.EPSILON) * factor) / factor;
}
