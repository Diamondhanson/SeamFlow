// ============================================================================
// GuidesProvider — remembers which first-timer guides a user has dismissed.
//
// The onboarding help (welcome slides, the Getting-Started checklist, and the
// little help card at the top of each flow) is meant to fade away once a user
// has seen it. This provider owns that "already seen" memory.
//
// Like FavoritesProvider, it's a *local, on-device* preference: the dismissed
// set is persisted to AsyncStorage so it survives restarts, but it isn't synced
// to the backend. Load once at mount, expose a `ready` flag so guides don't
// flash before hydration, and persist on every change.
//
//   const { isDismissed, dismiss } = useGuides();
//   if (!isDismissed('flow.newOrder')) { …show the help card… }
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'seamflow.guides.dismissed.v1';

export const WELCOME_GUIDE = 'welcome.intro';

interface GuidesState {
  /** Has the stored set finished loading? Guides render nothing until true. */
  ready: boolean;
  /** Has this guide key already been dismissed on this device? */
  isDismissed: (key: string) => boolean;
  /** Permanently dismiss a guide (fades it for good on this device). */
  dismiss: (key: string) => void;
  /** Clear every dismissed guide — used on sign-out so a fresh account sees them. */
  reset: () => void;
  /**
   * DEV helper: force the welcome slides to show on home even for an account
   * that isn't new (un-dismisses the welcome guide + flips the force flag).
   */
  forceWelcome: boolean;
  previewWelcome: () => void;
  /** End a welcome preview (clears the force flag and re-dismisses the guide). */
  endWelcome: () => void;
}

const GuidesContext = createContext<GuidesState | null>(null);

export function GuidesProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const [forceWelcome, setForceWelcome] = useState(false);

  // Load the persisted set once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setDismissed(new Set(parsed.filter((x): x is string => typeof x === 'string')));
          }
        }
      } catch {
        // Corrupt storage — start from an empty set rather than crashing.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      // Fire-and-forget persistence; the in-memory set is the source of truth.
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDismissed(new Set());
    void AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const isDismissed = useCallback((key: string) => dismissed.has(key), [dismissed]);

  const previewWelcome = useCallback(() => {
    // Un-dismiss the welcome guide so the gate re-opens, then force it on.
    setDismissed((prev) => {
      if (!prev.has(WELCOME_GUIDE)) return prev;
      const next = new Set(prev);
      next.delete(WELCOME_GUIDE);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
    setForceWelcome(true);
  }, []);

  const endWelcome = useCallback(() => {
    setForceWelcome(false);
    dismiss(WELCOME_GUIDE);
  }, [dismiss]);

  const value = useMemo<GuidesState>(
    () => ({ ready, isDismissed, dismiss, reset, forceWelcome, previewWelcome, endWelcome }),
    [ready, isDismissed, dismiss, reset, forceWelcome, previewWelcome, endWelcome],
  );

  return <GuidesContext.Provider value={value}>{children}</GuidesContext.Provider>;
}

export function useGuides(): GuidesState {
  const ctx = useContext(GuidesContext);
  if (!ctx) throw new Error('useGuides must be used inside GuidesProvider');
  return ctx;
}
