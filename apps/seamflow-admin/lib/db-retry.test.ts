import { describe, expect, it } from 'vitest';
import { isReadStatement, isTransientConnectionError, withReadRetry } from './db-retry';

// A stand-in for the postgres.js client: calling it with a template returns a
// thenable "query" whose outcomes are scripted, and it counts how often it ran.
function fakeClient(outcomes: Array<'ok' | string>) {
  let calls = 0;
  const client = ((strings: TemplateStringsArray) => {
    const mine = outcomes[calls++] ?? 'ok';
    const q = {
      strings,
      then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
        const p = mine === 'ok' ? Promise.resolve([{ n: 1 }]) : Promise.reject(Object.assign(new Error(mine), { code: mine }));
        return p.then(res, rej);
      },
    };
    return q;
  }) as never;
  return { client, calls: () => calls };
}
const read = (c: any) => c`select 1`;
const write = (c: any) => c`update t set a = 1`;

describe('what counts as retryable', () => {
  it('recognises a dropped connection and nothing else', () => {
    expect(isTransientConnectionError({ code: 'CONNECTION_CLOSED' })).toBe(true);
    expect(isTransientConnectionError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isTransientConnectionError({ code: '42P01' })).toBe(false);
    expect(isTransientConnectionError(new Error('boom'))).toBe(false);
    expect(isTransientConnectionError(undefined)).toBe(false);
  });

  it('retries reads — including ones that start with a comment — and never writes', () => {
    expect(isReadStatement(['select 1'])).toBe(true);
    expect(isReadStatement(['  with x as (select 1) select * from x'])).toBe(true);
    expect(isReadStatement(['-- why\n select 1'])).toBe(true);
    expect(isReadStatement(['update t set a = 1'])).toBe(false);
    expect(isReadStatement(['delete from t'])).toBe(false);
  });
});

describe('withReadRetry', () => {
  it('runs a read again when the connection had died, and returns its rows', async () => {
    const f = fakeClient(['CONNECTION_CLOSED', 'ok']);
    const sql = withReadRetry(f.client, { delayMs: 0 });
    await expect(read(sql)).resolves.toEqual([{ n: 1 }]);
    expect(f.calls()).toBe(2);
  });

  it('does not touch a healthy query', async () => {
    const f = fakeClient(['ok']);
    await expect(read(withReadRetry(f.client, { delayMs: 0 }))).resolves.toEqual([{ n: 1 }]);
    expect(f.calls()).toBe(1);
  });

  it('gives up after one retry and shows the real error', async () => {
    const f = fakeClient(['CONNECTION_CLOSED', 'CONNECTION_CLOSED', 'ok']);
    await expect(read(withReadRetry(f.client, { delayMs: 0 }))).rejects.toMatchObject({ code: 'CONNECTION_CLOSED' });
    expect(f.calls()).toBe(2);
  });

  it('never retries a real SQL error', async () => {
    const f = fakeClient(['42P01']);
    await expect(read(withReadRetry(f.client, { delayMs: 0 }))).rejects.toMatchObject({ code: '42P01' });
    expect(f.calls()).toBe(1);
  });

  it('never retries a write, even on a dropped connection', async () => {
    const f = fakeClient(['CONNECTION_CLOSED', 'ok']);
    await expect(write(withReadRetry(f.client, { delayMs: 0 }))).rejects.toMatchObject({ code: 'CONNECTION_CLOSED' });
    expect(f.calls()).toBe(1);
  });

  it('works inside Promise.all, as the dashboard pages use it', async () => {
    const f = fakeClient(['CONNECTION_CLOSED', 'ok', 'ok']);
    const sql = withReadRetry(f.client, { delayMs: 0 });
    const [a, b] = await Promise.all([read(sql), read(sql)]);
    expect(a).toEqual([{ n: 1 }]);
    expect(b).toEqual([{ n: 1 }]);
  });
});
