// ============================================================================
// Throttled nudges — the "from time to time" kind.
//
// GuidesProvider only remembers a permanent boolean per key, which suits
// one-and-done help cards: dismiss it, it is gone forever. Some prompts should
// keep coming back, just not on every launch. This module stores the moment the
// user last dismissed one and hides it until the window elapses, so a skipper
// is reminded occasionally rather than nagged or silenced for good.
//
// On-device only (AsyncStorage), like GuidesProvider — not synced to the API.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'seamflow.reminder.profile.snoozedUntil.v1';
const VERIFICATION_KEY = 'seamflow.reminder.verification.snoozedUntil.v1';

/** How long to wait after a dismissal before showing the nudge again. */
export const PROFILE_REMINDER_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Longer than the profile one, deliberately.
 *
 * The profile nudge chases something genuinely needed to use the app, so three
 * days is fair. Verification is optional by design (appendix J's one rule), and
 * asking every three days for something nobody has to do reads as pressure. A
 * week is often enough that a tailor who was not ready in week one still gets
 * asked in week three, which is the whole reason this snoozes rather than
 * dismissing forever.
 */
export const VERIFICATION_REMINDER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SnoozedReminder {
  /** Storage has loaded — render nothing until true to avoid a flash. */
  ready: boolean;
  /** Show the nudge now? True only while `active` and outside the window. */
  shouldShow: boolean;
  /** Dismiss for the snooze window. */
  snooze: () => void;
}

/**
 * @param active whether the nudge is relevant at all. When false, `shouldShow`
 *   is always false regardless of the snooze — so the CALLER decides relevance
 *   and this only decides timing.
 */
function useSnoozedReminder(
  storageKey: string,
  windowMs: number,
  active: boolean,
): SnoozedReminder {
  const [ready, setReady] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const ts = raw ? Number(raw) : 0;
        if (!cancelled) setSnoozedUntil(Number.isFinite(ts) ? ts : 0);
      } catch {
        // Corrupt/absent storage — treat as never snoozed.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const snooze = useCallback(() => {
    const until = Date.now() + windowMs;
    setSnoozedUntil(until);
    void AsyncStorage.setItem(storageKey, String(until));
  }, [storageKey, windowMs]);

  const shouldShow = ready && active && Date.now() >= snoozedUntil;
  return { ready, shouldShow, snooze };
}

/** "Complete your profile" — shown while the shop profile is still missing. */
export function useProfileReminder(active: boolean): SnoozedReminder {
  return useSnoozedReminder(PROFILE_KEY, PROFILE_REMINDER_SNOOZE_MS, active);
}

/**
 * "Get verified" — shown to a tailor who could ask and has not.
 *
 * The caller decides relevance, and the list of things that make this
 * irrelevant is longer than it looks: a pending request (asking twice while we
 * are the slow ones is insulting), an existing badge, no shop profile yet (the
 * profile nudge owns that moment, and two stacked nudges is nagging), and a
 * server with no OTP provider. See VerificationPrompt.
 */
export function useVerificationReminder(active: boolean): SnoozedReminder {
  return useSnoozedReminder(VERIFICATION_KEY, VERIFICATION_REMINDER_SNOOZE_MS, active);
}
