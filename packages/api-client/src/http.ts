import { ApiError } from './error';

export type JwtProvider =
  | string
  | null
  | undefined
  | (() => string | null | undefined | Promise<string | null | undefined>);

export interface HttpConfig {
  baseUrl: string;
  /** JWT (string), or a getter — sync or async. Header is omitted if missing. */
  getJwt?: JwtProvider;
  /** Optional fetch override (for tests). */
  fetch?: typeof fetch;
  /** Milliseconds before a request is abandoned. See DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * How long to wait before giving up on a request.
 *
 * There was no timeout at all, and the cost of that was not theoretical: the
 * API sleeps on its current hosting tier and takes ~30-60s to wake, so a
 * tailor pressing "Create + continue" got a screen that did nothing, with no
 * spinner, no error, and no end. They pressed it again. Eight identical
 * clients landed in the database inside one second.
 *
 * 45s is chosen to sit just past a cold start rather than under it — a
 * timeout that fires while the server is legitimately waking would turn a slow
 * success into a false failure, which is worse. Past that, something is wrong
 * and saying so beats waiting forever.
 */
const DEFAULT_TIMEOUT_MS = 45_000;

async function resolveJwt(getter: JwtProvider): Promise<string | null> {
  if (!getter) return null;
  if (typeof getter === 'string') return getter;
  if (typeof getter === 'function') {
    const v = await getter();
    return v ?? null;
  }
  return null;
}

function buildQuery(query?: Record<string, unknown>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getJwt: JwtProvider;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: HttpConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getJwt = config.getJwt;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // `.bind(globalThis)` is load-bearing on web. Browsers require fetch to be
    // invoked with `this === window`; storing it on an instance and calling
    // `this.fetchFn(...)` passes the Http instance instead, and every request
    // dies with "TypeError: Failed to execute 'fetch' on 'Window': Illegal
    // invocation". React Native's fetch is a plain polyfill with no such
    // requirement, so this only ever broke the browser build — where it made
    // every screen render its empty state over perfectly good data.
    const rawFetch = config.fetch ?? globalThis.fetch;
    this.fetchFn = rawFetch ? rawFetch.bind(globalThis) : rawFetch;
    if (!this.fetchFn) {
      throw new Error(
        'No global fetch available — pass `fetch` in HttpConfig (Node < 18, etc.)',
      );
    }
  }

  async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const jwt = await resolveJwt(this.getJwt);
    const headers: Record<string, string> = {};
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const url = `${this.baseUrl}${path}${buildQuery(opts.query)}`;

    // AbortController rather than Promise.race: racing leaves the request
    // running in the background, so a "timed out" write can still land on the
    // server minutes later with nothing watching for it.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      // A raw AbortError says nothing a tailor can act on. 0 rather than an
      // HTTP status because none was ever received.
      if ((err as Error)?.name === 'AbortError') {
        throw new ApiError(
          0,
          `The server did not answer in ${Math.max(1, Math.round(this.timeoutMs / 1000))} seconds. ` +
            'Check your connection and try again.',
          null,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const body: unknown = text ? safeJsonParse(text) : null;

    if (!res.ok) {
      const message = extractMessage(body, res.statusText);
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const m = (body as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return fallback || 'Request failed';
}
