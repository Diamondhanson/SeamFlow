import { useEffect, useState } from 'react';

/**
 * Returns a value that only updates after `delayMs` of stability.
 * Use for search-as-you-type UIs so the API call doesn't fire on every
 * keystroke.
 *
 * Pattern:
 *   const [q, setQ] = useState('');
 *   const debouncedQ = useDebouncedValue(q, 250);
 *   const { data } = useQuery(['clients', debouncedQ], () => api.clients.list({ q: debouncedQ }));
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
