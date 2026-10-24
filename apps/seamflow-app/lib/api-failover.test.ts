import { createFailoverFetch, RETRY_PRIMARY_AFTER_MS } from './api-failover';

const PRIMARY = 'https://api.example.com';
const BACKUP = 'https://backup.example.com';

const ok = (tag: string) => ({ ok: true, status: 200, tag }) as unknown as Response;
const down = () => new TypeError('Network request failed');

/** A fetch whose behaviour per host is scripted, recording every URL it was given. */
function scripted(handlers: Record<string, () => Promise<Response>>) {
  const calls: string[] = [];
  const fn = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const host = Object.keys(handlers).find((h) => url.startsWith(h));
    if (!host) throw new Error(`unscripted ${url}`);
    return handlers[host]!();
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('createFailoverFetch', () => {
  it('is the plain fetch when there is no backup', () => {
    const { fn } = scripted({});
    expect(createFailoverFetch({ primary: PRIMARY, backup: '', fetchImpl: fn })).toBe(fn);
    expect(createFailoverFetch({ primary: PRIMARY, backup: PRIMARY, fetchImpl: fn })).toBe(fn);
  });

  it('never touches the backup while the primary answers', async () => {
    const { fn, calls } = scripted({ [PRIMARY]: async () => ok('p'), [BACKUP]: async () => ok('b') });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });
    await f(`${PRIMARY}/feed`);
    expect(calls).toEqual([`${PRIMARY}/feed`]);
  });

  it('retries a GET on the backup when the connection fails, and keeps using it', async () => {
    const { fn, calls } = scripted({
      [PRIMARY]: async () => {
        throw down();
      },
      [BACKUP]: async () => ok('b'),
    });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });

    const first = (await f(`${PRIMARY}/feed?x=1`)) as unknown as { tag: string };
    expect(first.tag).toBe('b');
    expect(calls).toEqual([`${PRIMARY}/feed?x=1`, `${BACKUP}/feed?x=1`]);

    await f(`${PRIMARY}/orders`);
    // Second call goes straight to the backup — no wasted attempt on the dead host.
    expect(calls.slice(2)).toEqual([`${BACKUP}/orders`]);
  });

  it('does NOT retry a write, but routes the next request to the backup', async () => {
    const { fn, calls } = scripted({
      [PRIMARY]: async () => {
        throw down();
      },
      [BACKUP]: async () => ok('b'),
    });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });

    await expect(f(`${PRIMARY}/clients`, { method: 'POST' })).rejects.toThrow('Network request failed');
    expect(calls).toEqual([`${PRIMARY}/clients`]); // not duplicated onto the backup

    await f(`${PRIMARY}/clients`, { method: 'POST' });
    expect(calls[1]).toBe(`${BACKUP}/clients`); // the user's retry lands on the backup
  });

  it('does not fail over on an HTTP error — the host was reachable', async () => {
    const { fn, calls } = scripted({
      [PRIMARY]: async () => ({ ok: false, status: 500 }) as unknown as Response,
      [BACKUP]: async () => ok('b'),
    });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });
    const res = await f(`${PRIMARY}/feed`);
    expect(res.status).toBe(500);
    expect(calls).toEqual([`${PRIMARY}/feed`]);
  });

  it('does not fail over on a timeout/abort', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const { fn, calls } = scripted({
      [PRIMARY]: async () => {
        throw abort;
      },
      [BACKUP]: async () => ok('b'),
    });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });
    await expect(f(`${PRIMARY}/feed`)).rejects.toBe(abort);
    expect(calls).toEqual([`${PRIMARY}/feed`]);
  });

  it('tries the primary again once the window has passed', async () => {
    let t = 1_000;
    let primaryDown = true;
    const { fn, calls } = scripted({
      [PRIMARY]: async () => {
        if (primaryDown) throw down();
        return ok('p');
      },
      [BACKUP]: async () => ok('b'),
    });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn, now: () => t });

    await f(`${PRIMARY}/feed`); // primary fails -> backup
    primaryDown = false;
    t += RETRY_PRIMARY_AFTER_MS - 1;
    await f(`${PRIMARY}/feed`); // still inside the window -> backup
    expect(calls.at(-1)).toBe(`${BACKUP}/feed`);

    t += 2;
    await f(`${PRIMARY}/feed`); // window over -> primary again
    expect(calls.at(-1)).toBe(`${PRIMARY}/feed`);
  });

  it('leaves non-API URLs alone', async () => {
    const { fn, calls } = scripted({ 'https://storage.example.com': async () => ok('s') });
    const f = createFailoverFetch({ primary: PRIMARY, backup: BACKUP, fetchImpl: fn });
    await f('https://storage.example.com/obj');
    expect(calls).toEqual(['https://storage.example.com/obj']);
  });
});
