// ============================================================================
// FavoritesProvider — owns the set of "favorited" client IDs.
//
// Favorites are a *local, on-device* preference (per the product decision):
// the set is persisted to AsyncStorage so it survives restarts, but it is not
// synced to the backend and does not travel across devices or reinstalls.
//
// Mirrors the ThemeModeProvider pattern: load once at mount, expose a ready
// flag so callers can avoid acting on an empty set before hydration, and
// persist on every change.
//
// `useFavorites()` exposes the current set plus `isFavorite(id)` and a
// `toggleFavorite(id)` action.
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

const STORAGE_KEY = 'seamflow.clients.favorites';

interface FavoritesState {
  /** Set of favorited client IDs. */
  favorites: ReadonlySet<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /** Has the stored set finished loading? */
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  // Load the persisted set once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavorites(new Set(parsed.filter((x): x is string => typeof x === 'string')));
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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Fire-and-forget persistence; the in-memory set is the source of truth.
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const value = useMemo<FavoritesState>(
    () => ({ favorites, isFavorite, toggleFavorite, ready }),
    [favorites, isFavorite, toggleFavorite, ready],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used inside FavoritesProvider');
  }
  return ctx;
}
