/**
 * Central fetch wrapper: base URL from EXPO_PUBLIC_API_URL, optional auth headers
 * from setAuthHeadersFactory (Clerk JWT or dev UUID bearer).
 */

const DEFAULT_TIMEOUT_MS = 30_000;

type AuthHeadersFn = () => Promise<Record<string, string | undefined>>;

let authHeadersFactory: AuthHeadersFn = async () => {
  const id =
    process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  return { Authorization: `Bearer ${id}` };
};

/** Called from AuthContext / Clerk bridge so every request sends Authorization. */
export function setAuthHeadersFactory(fn: AuthHeadersFn): void {
  authHeadersFactory = fn;
}

function baseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (raw == null || raw.trim() === '') {
    throw new Error('Set EXPO_PUBLIC_API_URL in frontend/.env (see frontend/.env.example).');
  }
  return raw.replace(/\/$/, '');
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function detailMessage(body: unknown, fallback: string): string {
  if (body == null || typeof body !== 'object') {
    return fallback;
  }
  const d = (body as { detail?: unknown }).detail;
  if (typeof d === 'string') {
    return d;
  }
  if (Array.isArray(d)) {
    return d
      .map((e) =>
        typeof e === 'object' && e != null && 'msg' in e ? String((e as { msg: unknown }).msg) : JSON.stringify(e),
      )
      .join('; ');
  }
  return fallback;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (signal != null) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const rawAuth = await authHeadersFactory();
  const authHeaders = Object.fromEntries(
    Object.entries(rawAuth).filter(([, v]) => v != null && String(v).trim() !== ''),
  ) as Record<string, string>;

  try {
    const res = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new ApiError(`Invalid JSON response (${res.status})`, res.status, text);
      }
    }

    if (!res.ok) {
      throw new ApiError(detailMessage(parsed, res.statusText), res.status, parsed);
    }

    return parsed as T;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError('Request timed out or was cancelled', 0);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
    if (signal != null) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/** GET helper that returns null on 404 (e.g. profile not created yet). */
export async function apiGetOrNull<T>(path: string, options: ApiRequestOptions = {}): Promise<T | null> {
  try {
    return await apiRequest<T>(path, { ...options, method: 'GET' });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return null;
    }
    throw e;
  }
}
