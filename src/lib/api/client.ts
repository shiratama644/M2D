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

/**
 * Base request helper.
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

  const res = await fetch(fullUrl, { signal });

  if (!res.ok) {
    throw new ApiError(res.status, `Modrinth API error: HTTP ${res.status}`);
  }

  return res.json();
}
