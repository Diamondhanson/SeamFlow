// ============================================================================
// useProfileReminder — throttled "complete your profile" nudge.
//
// GuidesProvider only remembers a permanent boolean per key, which suits
// one-and-done help cards. The profile nudge is different: it should keep
// coming back — but not on every launch. This hook stores the moment the user
// last dismissed it and hides the banner until the snooze window elapses, so a
// skipper is reminded "from time to time" rather than nagged or silenced.
//
// On-device only (AsyncStorage), like GuidesProvider — not synced to the API.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'seamflow.reminder.profile.snoozedUntil.v1';

/** How long to wait after a dismissal before showing the nudge again. */
export const PROFILE_REMINDER_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface ProfileReminder {
  /** Storage has loaded — render nothing until true to avoid a flash. */
  ready: boolean;
  /** Show the nudge now? True only while `active` and outside the snooze window. */
  shouldShow: boolean;
  /** Dismiss for the snooze window. */
  snooze: () => void;
}

/**
 * @param active whether the nudge is relevant at all (e.g. the profile is still
 *   missing). When false, `shouldShow` is always false regardless of the snooze.
 */
export function useProfileReminder(active: boolean): ProfileReminder {
  const [ready, setReady] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
  }, []);

  const snooze = useCallback(() => {
    const until = Date.now() + PROFILE_REMINDER_SNOOZE_MS;
    setSnoozedUntil(until);
    void AsyncStorage.setItem(STORAGE_KEY, String(until));
  }, []);

  const shouldShow = ready && active && Date.now() >= snoozedUntil;
  return { ready, shouldShow, snooze };
}
