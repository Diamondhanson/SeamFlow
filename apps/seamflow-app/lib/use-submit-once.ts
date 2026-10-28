// ============================================================================
// One press, one save.
//
// A Save button that is still on screen after it worked invites a second press,
// and a second press creates a second client, a second measurement set, a second
// message. That is exactly what testers hit: the first save went through, the
// screen did not visibly change, so they pressed again and ended up with two.
//
// `begin()` hands out a release function the first time it is called and `null`
// for every call after that until the release is used, so a handler can say
//
//   const release = begin();
//   if (!release) return;               // a save is already in flight
//   create.mutate(input, { onError: release, … });
//
// and double taps, impatient taps and taps during a slow connection all collapse
// into one. A ref, not state: two taps inside the same frame both read the same
// "not busy yet" state, and a ref is the only thing that closes that gap.
//
// Release on failure so the person can fix the problem and try again. After a
// success that leaves the screen, simply never release — the screen is gone. After
// a success that STAYS on the screen, release in `onSettled`.
// ============================================================================

import { useCallback, useRef } from 'react';

export function useSubmitOnce(): () => (() => void) | null {
  const busy = useRef(false);
  return useCallback(() => {
    if (busy.current) return null;
    busy.current = true;
    return () => {
      busy.current = false;
    };
  }, []);
}
