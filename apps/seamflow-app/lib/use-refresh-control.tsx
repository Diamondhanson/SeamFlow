// ============================================================================
// Pull down to refresh — one behaviour for every screen that has it.
//
//   const refreshControl = useRefreshControl();
//   <ScrollView refreshControl={refreshControl} …>
//
// A pull re-asks the server for everything this screen is showing: every query
// that is mounted right now (the list, the counts in the header, the tab-bar
// badges). That is deliberately broader than "this screen's query", so a screen
// never has to name its own data and a new query on it is refreshed for free.
//
// Three rules:
//   - the spinner is the person's own, not the network's. It is driven by this
//     hook rather than react-query's `isRefetching`, so a background refetch
//     never makes a spinner appear by itself;
//   - it stays up for at least half a second. A pull that answers instantly
//     otherwise looks like it was ignored;
//   - it never hangs. Offline there is nothing to ask, and a request that
//     stalls is abandoned after a few seconds — whatever the network does, the
//     spinner comes back down.
//
// Must be called above any early return in the component (it is a hook).
// ============================================================================

import { useCallback, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAtelierTheme } from '@seamflow/ui';
import { useOnline } from './use-online';

/** The longest a pull is allowed to keep the spinner up. */
export const REFRESH_MAX_MS = 8000;
/** The shortest, so the gesture is visibly acknowledged. */
export const REFRESH_MIN_MS = 500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useRefreshControl(): ReactElement<RefreshControlProps> {
  const qc = useQueryClient();
  const online = useOnline();
  const { colors } = useAtelierTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const work = online
        ? Promise.race([
            // Errors are left to each screen's own error state; a failed pull
            // must not throw out of a gesture handler.
            qc.refetchQueries({ type: 'active' }).catch(() => undefined),
            wait(REFRESH_MAX_MS),
          ])
        : Promise.resolve();
      await Promise.all([work, wait(REFRESH_MIN_MS)]);
    } finally {
      setRefreshing(false);
    }
  }, [qc, online]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );
}
