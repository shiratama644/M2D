import { request, API_BASE, ApiError } from './client';

/**
 * Typed wrappers around the Modrinth v2 REST API.
 * All methods accept an optional AbortSignal for cancellation.
 */
export const modrinth = {
  /** Fetch a single project by slug or id. */
  getProject: (id, signal) =>
    request(`/project/${id}`, {}, signal),

  /** Full-text search. Returns { hits, total_hits, offset, limit }. */
  searchMods: (query, facets, offset, limit, index, signal) =>
    request('/search', { query, facets, offset, limit, index }, signal),

  /** Fetch multiple projects at once (up to 500 ids). */
  getProjects: (ids, signal) =>
    request('/projects', { ids }, signal),

  /**
   * Fetch available versions for a project.
   * Pass loader/version as empty strings to fetch all.
   */
  getVersions: (id, loader, version, signal) => {
    const loaders = loader ? [loader] : undefined;
    const game_versions = version ? [version] : undefined;
    return request(`/project/${id}/version`, { loaders, game_versions }, signal);
  },

  /** Fetch multiple versions by id at once. */
  getVersionsBulk: (ids, signal) =>
    request('/versions', { ids }, signal),

  /**
   * Identify a mod file by its SHA-1 hash.
   * Returns null when the hash is not found in Modrinth's database.
   */
  getVersionFile: async (hash, signal) => {
    const url = `${API_BASE}/version_file/${hash}?algorithm=sha1`;
    const res = await fetch(url, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, `Modrinth API error: HTTP ${res.status}`);
    return res.json();
  },

  /** Returns the full list of known Minecraft game versions. */
  getGameVersions: (signal) =>
    request('/tag/game_version', {}, signal),

  /** Returns the full list of mod categories. */
  getCategories: (signal) =>
    request('/tag/category', {}, signal),
};
