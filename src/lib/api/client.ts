/** Direct Modrinth API base – used for server-side fetches and as a fallback. */
export const API_BASE = 'https://api.modrinth.com/v2';

/**
 * Returns the base URL to use for API requests.
 *
 * - **Server** (SSR / Route Handlers): call Modrinth directly so that
 *   Next.js can attach `next: { revalidate }` options and deduplicate
 *   in-flight requests within a single render.
 * - **Client** (browser): route through our own `/api/v2` proxy so that
 *   Next.js server-side cache is shared across all visitors.
 */
export function getApiBase(): string {
  return typeof window === 'undefined' ? API_BASE : '/api/v2';
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/** Maximum number of retry attempts for transient failures. */
const MAX_RETRIES = 3;

/** Base delay (ms) for the first retry; doubles with each subsequent attempt. */
const RETRY_BASE_MS = 500;

/** Returns true for error conditions that are worth retrying. */
function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) {
    // Retry on server errors (5xx) and 429 Too Many Requests.
    return err.status >= 500 || err.status === 429;
  }
  // Retry on network-level failures (TypeError from fetch).
  return err instanceof TypeError;
}

/** Resolves after `ms` milliseconds, or rejects early if the signal is aborted. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/**
 * Base request helper with automatic retry on transient failures.
 *
 * Retries up to {@link MAX_RETRIES} times using exponential back-off
 * (500 ms → 1 s → 2 s). 4xx client errors are not retried.
 *
 * @param endpoint  - Path relative to the API base (e.g. "/project/sodium")
 * @param params    - Query parameters; objects are JSON-stringified automatically
 * @param signal    - Optional AbortSignal for request cancellation
 */
export async function request(
  endpoint: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const base = getApiBase();

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  });

  const query = searchParams.toString();
  const fullUrl = `${base}${endpoint}${query ? `?${query}` : ''}`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const res = await fetch(fullUrl, { signal });

      if (!res.ok) {
        throw new ApiError(res.status, `Modrinth API error: HTTP ${res.status}`);
      }

      return res.json();
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') throw err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;

      lastError = err;
      const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, 4_000);
      await sleep(delay, signal);
    }
  }

  throw lastError;
}
