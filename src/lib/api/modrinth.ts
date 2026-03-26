import { request, API_BASE, getApiBase, ApiError } from '@/lib/api/client';
import type { ModProject, ModHit, GameVersion, ModVersion } from '@/types/modrinth';

export interface SearchResult {
  hits: ModHit[];
  total_hits: number;
  offset: number;
  limit: number;
}

/**
 * Typed wrappers around the Modrinth v2 REST API.
 * All methods accept an optional AbortSignal for cancellation.
 */
export const modrinth = {
  /** Fetch a single project by slug or id. */
  getProject: (id: string, signal?: AbortSignal): Promise<ModProject> =>
    request(`/project/${id}`, {}, signal) as Promise<ModProject>,

  /** Full-text search. Returns { hits, total_hits, offset, limit }. */
  searchMods: (
    query: string,
    facets: string[][],
    offset: number,
    limit: number,
    index: string,
    signal?: AbortSignal,
  ): Promise<SearchResult> =>
    request('/search', { query, facets, offset, limit, index }, signal) as Promise<SearchResult>,

  /** Fetch multiple projects at once (up to 500 ids). */
  getProjects: (ids: string[], signal?: AbortSignal): Promise<ModProject[]> =>
    request('/projects', { ids }, signal) as Promise<ModProject[]>,

  /**
   * Fetch available versions for a project.
   * Pass loader/version as empty strings to fetch all.
   */
  getVersions: (
    id: string,
    loader: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<ModVersion[]> => {
    const loaders = loader ? [loader] : undefined;
    const game_versions = version ? [version] : undefined;
    return request(`/project/${id}/version`, { loaders, game_versions }, signal) as Promise<ModVersion[]>;
  },

  /** Fetch multiple versions by id at once. */
  getVersionsBulk: (ids: string[], signal?: AbortSignal): Promise<ModVersion[]> =>
    request('/versions', { ids }, signal) as Promise<ModVersion[]>,

  /**
   * Identify a mod file by its SHA-1 hash.
   * Returns null when the hash is not found in Modrinth's database.
   */
  getVersionFile: async (hash: string, signal?: AbortSignal): Promise<ModVersion | null> => {
    const url = `${getApiBase()}/version_file/${hash}?algorithm=sha1`;
    const res = await fetch(url, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiError(res.status, `Modrinth API error: HTTP ${res.status}`);
    return res.json() as Promise<ModVersion>;
  },

  /** Returns the full list of known Minecraft game versions. */
  getGameVersions: (signal?: AbortSignal): Promise<GameVersion[]> =>
    request('/tag/game_version', {}, signal) as Promise<GameVersion[]>,

  /** Returns the full list of project categories (all project types). */
  getCategories: (signal?: AbortSignal): Promise<import('../../types/modrinth').ModCategory[]> =>
    request('/tag/category', {}, signal) as Promise<import('../../types/modrinth').ModCategory[]>,
};
