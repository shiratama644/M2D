export const API_BASE = 'https://api.modrinth.com/v2';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Base request helper.
 * @param {string} endpoint  - Path relative to API_BASE (e.g. "/project/sodium")
 * @param {object} params    - Query parameters; objects are JSON-stringified automatically
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation
 */
export async function request(endpoint, params = {}, signal) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  });

  const res = await fetch(url.toString(), { signal });

  if (!res.ok) {
    throw new ApiError(res.status, `Modrinth API error: HTTP ${res.status}`);
  }

  return res.json();
}
