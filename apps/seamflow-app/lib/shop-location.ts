// ============================================================================
// One location fix, taken by the tailor, when they choose (appendix J.3/J.7).
//
// This module is deliberately the ONLY place in the app that touches location,
// and it can do exactly one thing: read the current position once, in the
// foreground, after an explicit tap. There is no watcher, no subscription, no
// background task and no way to ask for one — `expo-location` offers all of
// those and none of them is imported here. That is not an oversight to be
// tidied up later; it is the design, and J.7 records why at length:
//
//   · Background location is a restricted Play permission needing a
//     declaration, a video demo, and a justification as core functionality the
//     user benefits from. "We check our merchants are where they say" is fraud
//     tooling pointed at the person granting it. The package name is locked and
//     the listing is live.
//   · Consent obtained under "verify or be invisible" is not freely given.
//   · It does not stop the adversary anyway — a mock location, or an old phone
//     left at the address — while punishing the honest: tailors who work from
//     home, share a workshop, sell at the market, or travel for fittings.
//
// PRECISION IS DELIBERATELY REDUCED
//
// The question staff are answering is "is this roughly the area they claim",
// not "which doorway". Three decimal places is about 110 metres — a block — and
// that is all the check needs, so that is all we keep. A workshop is very often
// someone's home, and storing a ten-metre fix of where a person lives to answer
// a hundred-metre question is a liability with no matching benefit.
//
// And it is never shown to a client. A neighbourhood, never a pin (J.7).
// ============================================================================

import * as Location from 'expo-location';

/**
 * ~110 m at the equator. See the note above: the check is "right area", and
 * anything finer is precision we would be holding for no reason.
 */
const PLACES = 3;

export class LocationDeniedError extends Error {
  readonly canAskAgain: boolean;
  constructor(canAskAgain: boolean) {
    super('Location permission denied');
    this.name = 'LocationDeniedError';
    this.canAskAgain = canAskAgain;
  }
}

export class LocationUnavailableError extends Error {
  constructor() {
    super('Could not get a location fix');
    this.name = 'LocationUnavailableError';
  }
}

export interface ShopFix {
  lat: number;
  lng: number;
  /** Metres, as the device reported. Staff read it to judge the fix's worth. */
  accuracy: number | null;
}

function round(n: number): number {
  const f = 10 ** PLACES;
  return Math.round(n * f) / f;
}

/**
 * Ask once, read once, return once.
 *
 * `requestForegroundPermissionsAsync` — never `requestBackgroundPermissionsAsync`,
 * which is the call that would drag in the Play declaration and the review.
 *
 * Throws `LocationDeniedError` (carrying `canAskAgain`, so the UI can offer
 * Settings on iOS, which never re-prompts after a first denial) or
 * `LocationUnavailableError` when the device simply cannot get a fix — indoors,
 * or with location services off system-wide.
 */
export async function captureShopFix(): Promise<ShopFix> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new LocationDeniedError(perm.canAskAgain);
  }

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({
      // Balanced, not Highest: a ~100 m fix answers the question, arrives much
      // faster, and costs far less battery on the cheap Android phones most of
      // this market is using.
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    throw new LocationUnavailableError();
  }

  return {
    lat: round(position.coords.latitude),
    lng: round(position.coords.longitude),
    accuracy:
      position.coords.accuracy != null ? Math.round(position.coords.accuracy) : null,
  };
}
