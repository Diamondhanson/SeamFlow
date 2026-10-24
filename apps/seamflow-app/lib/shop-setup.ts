// ============================================================================
// How far along is someone's shop?
//
// "Has a shop" used to mean "a tailor row exists", which is true the moment they
// type a business name and a country — three fields, saved in one tap. That is
// far too low a bar to call a shop SET UP: nobody can tell what they make, where
// they are, or who they are.
//
// So there are three states, and the client "More" page reads them:
//   none        no shop yet                  → "Set up your shop"
//   incomplete  a shop, missing a vital      → "Continue setting up your shop"
//   complete    every vital present          → "Check out your shop"
//
// WHICH FIELDS ARE VITAL — deliberately few. The test is "can a stranger tell who
// this is and what they do?", not "is the profile full":
//   specialties  what they make; the thing discovery and request-matching read
//   city         where they are; clients look for someone near them
//   photo        who they are; the one trust signal on every card
// The business name is already required to create the shop at all.
//
// NOT vital, on purpose:
//   whatsapp  an opt-in PUBLIC number (the schema is explicit that it is null by
//             default); requiring it would defeat the opt-in.
//   bio, languages, slug — good to have, and none of them blocks being found.
//
// First clients, orders and templates are NOT part of this either. They are the
// getting-started checklist (components/GettingStarted), which is about running
// the business. A shop that is live and findable but has no orders yet is still
// a finished shop, and a button that said "Set up your shop" to its owner would
// feel like starting over.
// ============================================================================

export type ShopVital = 'specialties' | 'city' | 'photo';

/** Shape of `me.tailor` this needs — a subset, so tests don't build a whole Tailor. */
export interface ShopLike {
  specialties?: readonly string[] | null;
  city?: string | null;
  /** Free-text shop location. Counts as a city so nobody who set only this is nagged. */
  location?: string | null;
  photoUrl?: string | null;
  avatarPath?: string | null;
}

export type ShopSetup = 'unknown' | 'none' | 'incomplete' | 'complete';

const filled = (v: string | null | undefined) => (v ?? '').trim().length > 0;

/** The vitals this shop is still missing, in the order they should be asked for. */
export function missingShopVitals(shop: ShopLike | null | undefined): ShopVital[] {
  const missing: ShopVital[] = [];
  if (!shop || (shop.specialties?.length ?? 0) === 0) missing.push('specialties');
  if (!shop || !(filled(shop.city) || filled(shop.location))) missing.push('city');
  if (!shop || !(filled(shop.photoUrl) || filled(shop.avatarPath))) missing.push('photo');
  return missing;
}

/**
 * `me` is `undefined` while the profile is still loading — that is 'unknown',
 * not 'none', so the button doesn't flash "Set up your shop" at someone who has
 * one. `null` (loaded, no shop) is 'none'.
 */
export function shopSetup(me: { tailor?: ShopLike | null } | null | undefined): ShopSetup {
  if (me === undefined) return 'unknown';
  if (!me?.tailor) return 'none';
  return missingShopVitals(me.tailor).length === 0 ? 'complete' : 'incomplete';
}

/**
 * Where "Continue setting up" should open: the screen that fixes the FIRST
 * missing vital, so the person lands on the next thing to do instead of a
 * dashboard that has to be read to find out.
 */
export function nextShopStepHref(shop: ShopLike | null | undefined): string {
  const [first] = missingShopVitals(shop);
  if (first === 'specialties') return '/(app)/specialties';
  if (first === 'photo') return '/(app)/me';
  return '/(app)/feed/storefront';
}
