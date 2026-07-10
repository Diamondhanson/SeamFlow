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
