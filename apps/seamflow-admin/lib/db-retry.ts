// ============================================================================
// One quiet retry for a connection that died while nobody was looking.
//
// WHY THIS EXISTS
//
// On Vercel a function instance is FROZEN between requests. The pool inside it
// keeps its sockets, but while the instance sleeps the database pooler closes
// them. The next request wakes up, trusts a connection that is already dead, and
// the very first query fails with CONNECTION_CLOSED — then the next request, on a
// fresh connection, works. That is the "sometimes it opens, sometimes it shows
// Query failed" the ops dashboard was doing. Nothing is wrong with the database
// and nothing is wrong with the query; the socket was simply stale.
//
// WHAT IT DOES
//
// If a READ fails with one of the "the connection went away" errors, run it once
// more on a new connection. Nothing else changes: a real SQL error, a timeout of
// the query itself, or anything that is not a dropped connection is thrown as it
// always was.
//
// WHY ONLY READS
//
// A write that failed with "connection closed" may or may not have been applied
// before the line dropped. Running it again could do it twice. The dashboard's
// few writes (the allowlisted cleanups) go through transactions or are left alone,
// so only statements that begin with SELECT or WITH are retried.
// ============================================================================

import type postgres from 'postgres';

/** Errors that mean "the socket died", as postgres.js and Node name them. */
export const TRANSIENT_CODES = new Set([
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  'CONNECT_TIMEOUT',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'ENOTFOUND',
]);

export function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && TRANSIENT_CODES.has(code);
}

const READ_ONLY = /^(?:\s|--[^\n]*\n)*(?:select|with)\b/i;

/** True when the statement is a plain read. Comments and whitespace may precede it. */
export function isReadStatement(strings: readonly string[]): boolean {
  return READ_ONLY.test(strings.join(' '));
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  /** Extra attempts after the first. One is enough for a stale socket. */
  retries?: number;
  /** Pause before trying again, so a pooler that is restarting can finish. */
  delayMs?: number;
}

/**
 * Wrap a postgres.js client so awaited reads retry once on a dead connection.
 *
 * It returns a Proxy of the SAME client, and the queries it hands back are the
 * library's own Query objects with only their `then` replaced. That matters:
 * this codebase builds queries out of fragments (`sql` stored in a variable and
 * interpolated into another query), and a fragment must still be a real Query
 * for the library to recognise it. Everything except awaiting is untouched.
 */
export function withReadRetry<T extends postgres.Sql>(client: T, opts: RetryOptions = {}): T {
  const retries = opts.retries ?? 1;
  const delayMs = opts.delayMs ?? 150;

  return new Proxy(client, {
    apply(target, thisArg, args: unknown[]) {
      const query = Reflect.apply(target as unknown as (...a: unknown[]) => unknown, thisArg, args) as {
        then?: (...a: unknown[]) => unknown;
      };

      // Only tagged-template calls (sql`select …`) are statements. sql(value) and
      // friends build helpers, and are left exactly as they were.
      const first = args[0];
      const isTemplate = Array.isArray(first) && !!(first as { raw?: unknown }).raw;
      if (!isTemplate || !isReadStatement(first as readonly string[]) || typeof query?.then !== 'function') {
        return query;
      }

      const firstTry = query.then.bind(query) as (
        onFulfilled?: unknown,
        onRejected?: unknown,
      ) => Promise<unknown>;

      query.then = (onFulfilled?: unknown, onRejected?: unknown) => {
        const run = async (): Promise<unknown> => {
          try {
            return await firstTry();
          } catch (err) {
            let last = err;
            for (let i = 0; i < retries && isTransientConnectionError(last); i++) {
              await wait(delayMs);
              try {
                // A NEW query object: a finished one cannot be executed again.
                return await (Reflect.apply(
                  target as unknown as (...a: unknown[]) => unknown,
                  thisArg,
                  args,
                ) as PromiseLike<unknown>);
              } catch (again) {
                last = again;
              }
            }
            throw last;
          }
        };
        return run().then(onFulfilled as never, onRejected as never);
      };
      return query;
    },
  });
}
