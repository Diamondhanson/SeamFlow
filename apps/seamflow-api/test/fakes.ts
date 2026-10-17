/**
 * Hand-written fakes for the three dependencies nearly every unit here needs.
 *
 * These are not mocks of a library — they are the smallest things that behave
 * like the real collaborator for the branch under test. When a test needs a
 * different answer it passes one in, so the fake never grows a config object.
 */
import type { ExecutionContext } from '@nestjs/common';

/** A Reflector that answers from a plain map of metadata key → value. */
export function fakeReflector(metadata: Record<string, unknown> = {}) {
  return {
    getAllAndOverride: <T>(key: string): T | undefined =>
      metadata[key] as T | undefined,
    get: <T>(key: string): T | undefined => metadata[key] as T | undefined,
    getAll: <T>(key: string): T[] => [metadata[key] as T],
    getAllAndMerge: <T>(key: string): T => metadata[key] as T,
  };
}

/**
 * An ExecutionContext wrapping a request object. Only the three methods the
 * guards actually call are implemented; anything else would be dead weight.
 */
export function fakeContext(req: Record<string, unknown>): ExecutionContext {
  const ctx = {
    switchToHttp: () => ({
      getRequest: <T>() => req as T,
      getResponse: <T>() => ({}) as T,
      getNext: <T>() => ({}) as T,
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  };
  return ctx as unknown as ExecutionContext;
}

/**
 * A DbService whose `select()` chain resolves to `rows`. Drizzle's builder is
 * chainable and thenable, so one object that returns itself covers
 * select/from/where/limit/orderBy and awaits to the rows.
 */
export function fakeDb(rows: unknown[] = [], opts: { configured?: boolean } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'orderBy', 'offset', 'innerJoin', 'leftJoin']) {
    chain[m] = () => chain;
  }
  chain.then = (resolve: (v: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
  return {
    db: chain,
    isConfigured: () => opts.configured ?? true,
  };
}

/** A DbService whose every query rejects — the "database blip" case. */
export function brokenDb(message = 'connection terminated unexpectedly') {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'orderBy', 'offset']) {
    chain[m] = () => chain;
  }
  chain.then = (_r: unknown, reject: (e: Error) => unknown) =>
    Promise.reject(new Error(message)).catch((e) => {
      if (reject) return reject(e);
      throw e;
    });
  return { db: chain, isConfigured: () => true };
}

/** A SupabaseService whose admin().auth.getUser() returns a fixed answer. */
export function fakeSupabase(
  answer: { user?: { id: string; email?: string | null; phone?: string | null } | null; error?: unknown },
) {
  return {
    admin: () => ({
      auth: {
        getUser: async () => ({
          data: { user: answer.user ?? null },
          error: answer.error ?? null,
        }),
      },
    }),
  };
}

/** Builds a JWT-shaped string with the given payload. Unsigned — the guards
 *  under test read claims from a token Supabase has already verified. */
export function jwtWithClaims(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.signature`;
}

/**
 * A DbService whose successive queries resolve to successive entries in
 * `queue`. Drizzle's builder is chainable and thenable, so awaiting the chain
 * shifts one entry off.
 *
 * This is what lets an ownership check be tested at all: the interesting case
 * is "the first lookup finds the caller's own row, the second finds nothing",
 * and a fake that answers every query identically cannot express it. Queries
 * are recorded in `calls` so a test can assert how many ran — i.e. that the
 * method stopped at the failing check instead of carrying on to the write.
 *
 * Running past the end of the queue throws rather than returning `[]`: a
 * silent empty result is how a test passes for the wrong reason.
 */
export function fakeDbQueue(queue: unknown[][]) {
  const remaining = [...queue];
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of [
    'select', 'from', 'where', 'limit', 'orderBy', 'offset',
    'innerJoin', 'leftJoin', 'values', 'returning', 'set', 'onConflictDoUpdate',
  ]) {
    chain[m] = (...args: unknown[]) => {
      if (m === 'from' || m === 'insert' || m === 'update') calls.push(m);
      void args;
      return chain;
    };
  }
  chain.insert = () => {
    calls.push('insert');
    return chain;
  };
  chain.update = () => {
    calls.push('update');
    return chain;
  };
  chain.delete = () => chain;
  chain.then = (resolve: (v: unknown[]) => unknown, reject?: (e: Error) => unknown) => {
    if (!remaining.length) {
      const err = new Error(
        `fakeDbQueue ran out of results after ${queue.length} queries — the code under test made more than the test expected`,
      );
      return reject ? reject(err) : Promise.reject(err);
    }
    return Promise.resolve(remaining.shift()!).then(resolve);
  };
  chain.transaction = async (fn: (tx: unknown) => unknown) => fn(chain);

  return {
    service: { db: chain, isConfigured: () => true },
    calls,
    get left() {
      return remaining.length;
    },
  };
}
