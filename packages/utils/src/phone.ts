import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * `defaultCountry` is typed as a plain string rather than libphonenumber's
 * `CountryCode` union.
 *
 * Every caller gets this value from data — `tailors.country_code`, a form
 * field — where it is a `string` and cannot be narrowed without a cast at each
 * site. Forcing that cast bought no safety: an invalid code is a runtime
 * possibility either way, and `parsePhoneNumberFromString` already answers it
 * by returning null rather than throwing. One documented cast here is better
 * than a scattering of unchecked ones.
 */
export function normalizePhone(raw: string, defaultCountry?: string): string | null {
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as CountryCode | undefined);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function isValidPhone(raw: string, defaultCountry?: string): boolean {
  return normalizePhone(raw, defaultCountry) !== null;
}
