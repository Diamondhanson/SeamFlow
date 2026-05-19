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
}

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

  constructor(config: HttpConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getJwt = config.getJwt;
    this.fetchFn = config.fetch ?? globalThis.fetch;
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
    const res = await this.fetchFn(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

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
