import { describe, it, expect } from 'vitest';
import { createApiClient } from './client';
import { ApiError } from './error';

interface CapturedCall {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body?: string;
}

function makeMockFetch(response: {
  status: number;
  body?: unknown;
  text?: string;
}): { fetch: typeof fetch; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const mock = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({
      url,
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    const nullBody = response.status === 204 || response.status === 205;
    const text = nullBody
      ? null
      : response.text ??
        (response.body !== undefined ? JSON.stringify(response.body) : '');
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: mock as typeof fetch, calls };
}

describe('createApiClient', () => {
  it('attaches Authorization header when jwt is a string', async () => {
    const { fetch, calls } = makeMockFetch({
      status: 200,
      body: { ok: true, version: '0.1.0', uptime_s: 1, db: 'up', redis: 'up', sentry: 'enabled' },
    });
    const api = createApiClient({
      baseUrl: 'http://localhost:3001',
      getJwt: 'token-abc',
      fetch,
    });
    await api.health.check();
    expect(calls[0].url).toBe('http://localhost:3001/health');
    expect(calls[0].headers.Authorization).toBe('Bearer token-abc');
  });

  it('resolves async jwt getter on every request', async () => {
    let counter = 0;
    const { fetch } = makeMockFetch({ status: 200, body: { ok: true, version: '0', uptime_s: 0, db: 'up', redis: 'up', sentry: 'disabled' } });
    const api = createApiClient({
      baseUrl: 'http://localhost:3001',
      getJwt: async () => `token-${++counter}`,
      fetch,
    });
    await api.health.check();
    await api.health.check();
    // No assertion on specific value — just verifies the getter is invoked
    // without errors when async.
    expect(counter).toBe(2);
  });

  it('omits Authorization when jwt is null', async () => {
    const { fetch, calls } = makeMockFetch({ status: 200, body: { ok: true, version: '0', uptime_s: 0, db: 'up', redis: 'up', sentry: 'disabled' } });
    const api = createApiClient({
      baseUrl: 'http://localhost:3001',
      getJwt: () => null,
      fetch,
    });
    await api.health.check();
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('builds query string for list endpoints', async () => {
    const { fetch, calls } = makeMockFetch({ status: 200, body: { items: [], limit: 25, offset: 0 } });
    const api = createApiClient({ baseUrl: 'http://localhost:3001', fetch });
    await api.clients.list({ limit: 25, offset: 0, q: 'ada' });
    expect(calls[0].url).toBe('http://localhost:3001/clients?limit=25&offset=0&q=ada');
  });

  it('serializes JSON body and sets Content-Type for POST', async () => {
    const { fetch, calls } = makeMockFetch({
      status: 201,
      body: {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        tailorId: 't',
        fullName: 'Ada',
        phone: '+1',
        email: null,
        notes: null,
        createdAt: '2026-05-19T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z',
      },
    });
    const api = createApiClient({ baseUrl: 'http://localhost:3001', fetch, getJwt: 'jwt' });
    const result = await api.clients.create({ fullName: 'Ada', phone: '+1' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(calls[0].body).toBe('{"fullName":"Ada","phone":"+1"}');
    expect(result.fullName).toBe('Ada');
  });

  it('returns undefined for 204 No Content', async () => {
    const { fetch } = makeMockFetch({ status: 204, text: '' });
    const api = createApiClient({ baseUrl: 'http://localhost:3001', fetch });
    const result = await api.clients.delete('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(result).toBeUndefined();
  });

  it('throws ApiError with the right status on non-2xx', async () => {
    const { fetch } = makeMockFetch({
      status: 401,
      body: { statusCode: 401, message: 'Missing bearer token', error: 'Unauthorized' },
    });
    const api = createApiClient({ baseUrl: 'http://localhost:3001', fetch });
    await expect(api.me.get()).rejects.toThrowError(ApiError);

    let caught: ApiError | undefined;
    try {
      await api.me.get();
    } catch (err) {
      caught = err as ApiError;
    }
    expect(caught?.status).toBe(401);
    expect(caught?.isUnauthorized()).toBe(true);
    expect(caught?.message).toBe('Missing bearer token');
  });

  it('handles validation error message arrays from NestJS', async () => {
    const { fetch } = makeMockFetch({
      status: 400,
      body: {
        statusCode: 400,
        message: ['fullName is required', 'phone must be a string'],
        error: 'Bad Request',
      },
    });
    const api = createApiClient({ baseUrl: 'http://localhost:3001', fetch });
    let caught: ApiError | undefined;
    try {
      // @ts-expect-error — intentionally sending invalid body
      await api.clients.create({});
    } catch (err) {
      caught = err as ApiError;
    }
    expect(caught?.isValidationError()).toBe(true);
    expect(caught?.message).toBe('fullName is required, phone must be a string');
  });
});
