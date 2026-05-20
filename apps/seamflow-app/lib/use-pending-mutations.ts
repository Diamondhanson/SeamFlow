import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribes to the MutationCache and returns the count of mutations that
 * are queued but not yet successful — either:
 *   - paused (offline, waiting to fire)
 *   - errored (last attempt failed, eligible for retry)
 *
 * Used by the OfflineBanner to surface "N changes will sync when you
 * reconnect" so the user has confidence their offline edits aren't lost.
 */
export function usePendingMutations(): number {
  const qc = useQueryClient();
  const [count, setCount] = useState(() => readPending(qc));

  useEffect(() => {
    const cache = qc.getMutationCache();
    const unsub = cache.subscribe(() => {
      setCount(readPending(qc));
    });
    return () => unsub();
  }, [qc]);

  return count;
}

function readPending(qc: ReturnType<typeof useQueryClient>): number {
  return qc
    .getMutationCache()
    .getAll()
    .filter((m) => {
      const s = m.state.status;
      // `pending` covers both "currently running" and "paused offline".
      // `error` is a transient failure that can be retried.
      return s === 'pending' || s === 'error';
    }).length;
}
