import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export function normalizePhone(raw: string, defaultCountry?: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(raw, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function isValidPhone(raw: string, defaultCountry?: CountryCode): boolean {
  return normalizePhone(raw, defaultCountry) !== null;
}
