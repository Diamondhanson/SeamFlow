// ============================================================================
// A fetch that falls back to a second hostname for the SAME API.
//
// Why it exists: some routers and DNS filters refuse a hostname outright — the
// connection fails before a single byte comes back — while the same service is
// perfectly reachable under another name. The API answers on both
// api.seamflowtech.com (primary) and seamflow-api.onrender.com (backup), so when
// the primary cannot be reached at all, the backup usually can.
//
// What it will NOT do, on purpose:
//   - Fail over on a TIMEOUT. A slow server and a blocked one look identical,
//     and the backup is the same service, so it would be just as slow. The
//     client's own 45s abort stays in charge of that.
//   - Fail over on an HTTP error. A 4xx/5xx is an answer; the host was reachable.
//   - Silently retry a write. A POST that failed mid-flight may already have
//     landed, and this codebase has been bitten by duplicate writes before. A
//     failed write surfaces its error; only the NEXT request is routed to the
//     backup.
//
// Both hostnames serve one service, so remembering "use the backup for a while"
// has no correctness cost — it is purely a routing choice, and after
// RETRY_PRIMARY_AFTER_MS the primary is tried again.
// ============================================================================

export const RETRY_PRIMARY_AFTER_MS = 10 * 60 * 1000;

const IDEMPOTENT = new Set(['GET', 'HEAD']);

/** The connection itself failed — as opposed to a timeout, an abort, or an HTTP error. */
function isConnectionFailure(err: unknown): boolean {
  if (!err || (err as Error).name === 'AbortError') return false;
  if (err instanceof TypeError) return true;
  // React Native and some polyfills throw a plain Error with these messages.
  return /network request failed|failed to fetch|network error|load failed/i.test(
    String((err as Error).message ?? ''),
  );
}

function trim(base: string): string {
  return base.replace(/\/+$/, '');
}

export function createFailoverFetch(opts: {
  primary: string;
  backup?: string;
  /** Defaults to the global fetch. Injectable for tests. */
  fetchImpl?: typeof fetch;
  now?: () => number;
}): typeof fetch {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const primary = trim(opts.primary);
  const backup = opts.backup ? trim(opts.backup) : '';

  // Nothing to fail over to: behave exactly like the plain fetch.
  if (!backup || backup === primary) return fetchImpl;

  const now = opts.now ?? Date.now;
  let useBackupUntil = 0;

  const toBackup = (url: string) => backup + url.slice(primary.length);

  const failover = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Not one of our API calls (e.g. a signed storage URL) — leave it alone.
    if (!url.startsWith(primary)) return fetchImpl(input, init);

    if (now() < useBackupUntil) {
      try {
        return await fetchImpl(toBackup(url), init);
      } catch (err) {
        // The backup failed too: stop preferring it, so the next call re-tries the primary.
        if (isConnectionFailure(err)) useBackupUntil = 0;
        throw err;
      }
    }

    try {
      return await fetchImpl(input, init);
    } catch (err) {
      if (!isConnectionFailure(err) || init?.signal?.aborted) throw err;

      useBackupUntil = now() + RETRY_PRIMARY_AFTER_MS;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (!IDEMPOTENT.has(method)) throw err;
      return fetchImpl(toBackup(url), init);
    }
  }) as typeof fetch;

  return failover;
}
