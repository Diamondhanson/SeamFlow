import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { registerMutationDefaults } from './mutation-defaults';

// ============================================================================
// Offline-first wiring
//
// The basic deal:
//   - Every API call goes through TanStack Query's useQuery / useMutation
//   - Query results are cached in memory AND persisted to AsyncStorage
//   - On app start, the persisted cache is rehydrated → screens render
//     instantly with last-known-good data
//   - NetInfo tells TanStack Query whether we're online; when offline,
//     mutations pause and resume automatically when the connection returns
//   - When the app comes back to foreground, all queries refetch
//
// Cache durations:
//   - staleTime: how long results are considered fresh (no refetch)
//   - gcTime / maxAge: how long disposed queries stay cached
// We set staleTime conservatively (5 min) so screens feel snappy but
// background refetches catch updates from other devices.
// ============================================================================

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Bumped v1 → v2 when mutations switched to networkMode 'online' (see below).
// The old key held error-state mutations that could never replay and left the
// "Syncing…" banner stuck; a new key gives every install a clean slate.
const PERSIST_KEY = 'seamflow:react-query-cache:v2';
const STALE_PERSIST_KEYS = ['seamflow:react-query-cache:v1'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: PERSIST_MAX_AGE_MS,
      retry: (failureCount, err) => {
        // Don't retry 4xx — that's the user/server saying "no". Retry 5xx
        // and network errors up to 2 times.
        if (
          err &&
          typeof err === 'object' &&
          'status' in err &&
          typeof (err as { status: number }).status === 'number'
        ) {
          const s = (err as { status: number }).status;
          if (s >= 400 && s < 500) return false;
        }
        return failureCount < 2;
      },
      // Offline-first: serve cached data when offline; refetch when online.
      networkMode: 'offlineFirst',
      // Pull fresh server data when connectivity returns or the app is
      // refocused, so a tailor who was offline sees up-to-date data on
      // reconnect. (These are TanStack defaults — pinned here to make the
      // offline-sync intent explicit.) A dedicated delta /sync/pull endpoint
      // exists for efficient multi-device sync but isn't needed for the
      // single-tailor model.
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // 'online' (NOT 'offlineFirst'): when offline a mutation PAUSES without
      // attempting the request, so it survives in the queue and is replayed by
      // resumePausedMutations() on reconnect. 'offlineFirst' would fire the
      // request once even offline → it fails with "Network request failed",
      // lands in an un-resumable error state, and the edit is lost.
      networkMode: 'online',
      retry: false,
    },
  },
});

// Wire up the canonical mutationFn for every persistable mutation. Must
// happen BEFORE any component renders (i.e. at module load) so that when
// the persistor restores paused mutations, their mutationFn is already
// registered against the same QueryClient instance.
registerMutationDefaults(queryClient);

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  throttleTime: 1000, // batch writes so storage isn't hit on every cache update
});

// ============================================================================
// Hook TanStack Query's online status into NetInfo (sets onlineManager state)
// and refetch-on-focus into the React Native AppState.
// ============================================================================

let listenersInstalled = false;

export function installOfflineListeners(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;

  // Drop any orphaned cache from a previous PERSIST_KEY version (fire-and-forget).
  void AsyncStorage.multiRemove(STALE_PERSIST_KEYS).catch(() => {});

  onlineManager.setEventListener((setOnline) => {
    const sub = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is more accurate but can be null on first event;
      // fall back to `isConnected`.
      const online =
        state.isInternetReachable === null
          ? !!state.isConnected
          : !!state.isInternetReachable;
      setOnline(online);
    });
    return () => sub();
  });

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      handleFocus(status === 'active');
    });
    return () => sub.remove();
  });
}

/** Invalidate every query — used after sign-out to drop the previous user's data. */
export function invalidateAll(): Promise<void> {
  return queryClient.invalidateQueries();
}

/**
 * Clear the in-memory + persisted cache entirely. Critically also drops
 * the MutationCache — without that, a paused offline mutation queued by
 * one tailor could fire under the next-signed-in tailor's JWT and write
 * to the wrong account. `queryClient.clear()` clears queries but NOT
 * mutations, so we wipe both explicitly.
 */
export async function clearCache(): Promise<void> {
  queryClient.clear();
  queryClient.getMutationCache().clear();
  await AsyncStorage.removeItem(PERSIST_KEY);
}
