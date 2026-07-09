// ============================================================================
// Device contacts — read-only access to the phone's address book.
//
// Used by the order / group-owner pickers so a tailor can select a person
// straight from their contacts instead of retyping name + number. Contacts are
// ONLY read on-device; nothing is uploaded. A person becomes a saved client
// lazily, on the server, the first time they're attached to an order.
//
// Numbers are normalized to E.164 (via libphonenumber-js, using the tailor's
// country as the default region) so they de-dupe cleanly against existing
// clients and format consistently.
//
// Requires the native `expo-contacts` module — run `npx expo install
// expo-contacts` and rebuild the dev client before this resolves.
// ============================================================================

import * as Contacts from 'expo-contacts';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export interface DeviceContact {
  /** Stable-ish id for list keys (contact id, or a name+phone fallback). */
  id: string;
  name: string;
  /** E.164 when we could parse it, otherwise the raw digits as stored. */
  phone: string;
  /** True when the number parsed to a valid E.164. */
  normalized: boolean;
}

/**
 * Ensure we have permission to read contacts. Returns false (rather than
 * throwing) when the user has denied and can't be asked again, so callers can
 * show a friendly "enable in Settings" message.
 */
export async function ensureContactsPermission(): Promise<boolean> {
  const current = await Contacts.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const req = await Contacts.requestPermissionsAsync();
  return req.granted;
}

/**
 * Read the address book and return a de-duplicated, alphabetically-sorted list
 * of contacts that have both a name and at least one phone number.
 */
export async function fetchDeviceContacts(
  defaultCountry: CountryCode,
): Promise<DeviceContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
    ],
  });

  const out: DeviceContact[] = [];
  for (const c of data) {
    // Android often leaves the composite `name` empty for contacts synced from
    // Google/other accounts, while first/last are populated — fall back to
    // those so those contacts aren't silently dropped (empty picker).
    const name =
      c.name?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
    const raw = c.phoneNumbers?.[0]?.number?.trim();
    if (!name || !raw) continue;

    const parsed = parsePhoneNumberFromString(raw, defaultCountry);
    out.push({
      id: c.id ?? `${name}:${raw}`,
      name,
      phone: parsed?.isValid() ? parsed.number : raw.replace(/\s+/g, ''),
      normalized: Boolean(parsed?.isValid()),
    });
  }

  // De-dupe by resolved phone, then sort by name (locale-aware, case-insensitive).
  const seen = new Set<string>();
  const deduped = out.filter((c) => {
    if (seen.has(c.phone)) return false;
    seen.add(c.phone);
    return true;
  });
  deduped.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  return deduped;
}
