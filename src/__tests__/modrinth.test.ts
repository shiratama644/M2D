/**
 * Tests for the modrinth API wrapper (src/lib/api/modrinth.ts).
 *
 * All tests mock the global `fetch` so no real HTTP requests are made.
 * The modrinth module delegates to `request()` from client.ts for most
 * methods, and calls `fetch()` directly only for `getVersionFile`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { modrinth } from '@/lib/api/modrinth';
import { ApiError } from '@/lib/api/client';

describe('modrinth API wrapper', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getProject
  // ---------------------------------------------------------------------------

  describe('getProject', () => {
    it('calls the correct endpoint URL', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'sodium' }) });

      await modrinth.getProject('sodium');

      expect(mockFetch).toHaveBeenCalledOnce();
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/project/sodium');
    });

    it('returns the project data', async () => {
      const projectData = { id: 'sodium', title: 'Sodium', slug: 'sodium' };
      mockFetch.mockResolvedValue({ ok: true, json: async () => projectData });

      const result = await modrinth.getProject('sodium');

      expect(result).toEqual(projectData);
    });

    it('forwards AbortSignal to fetch', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
      const controller = new AbortController();

      await modrinth.getProject('sodium', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('propagates errors from the underlying request', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

      await expect(modrinth.getProject('nonexistent')).rejects.toBeInstanceOf(ApiError);
    });
  });

  // ---------------------------------------------------------------------------
  // searchMods
  // ---------------------------------------------------------------------------

  describe('searchMods', () => {
    it('calls /search with query, limit, offset, and index', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hits: [], total_hits: 0 }) });

      await modrinth.searchMods('sodium', [['project_type:mod']], 0, 12, 'downloads');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/search');
      expect(calledUrl).toContain('query=sodium');
      expect(calledUrl).toContain('limit=12');
      expect(calledUrl).toContain('offset=0');
      expect(calledUrl).toContain('index=downloads');
    });

    it('JSON-encodes the facets array in the URL', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hits: [] }) });
      const facets = [['project_type:mod'], ['categories:optimization']];

      await modrinth.searchMods('', facets, 0, 10, 'relevance');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent(JSON.stringify(facets)));
    });

    it('returns the search result object', async () => {
      const data = { hits: [{ project_id: 'abc', title: 'Mod' }], total_hits: 1, offset: 0, limit: 12 };
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });

      const result = await modrinth.searchMods('mod', [], 0, 12, 'relevance');

      expect(result).toEqual(data);
    });

    it('forwards AbortSignal', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hits: [] }) });
      const controller = new AbortController();

      await modrinth.searchMods('', [], 0, 10, 'relevance', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getProjects
  // ---------------------------------------------------------------------------

  describe('getProjects', () => {
    it('calls /projects with the ids parameter', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getProjects(['sodium', 'lithium']);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/projects');
      expect(calledUrl).toContain('ids=');
    });

    it('returns an array of projects', async () => {
      const projects = [{ id: 'sodium' }, { id: 'lithium' }];
      mockFetch.mockResolvedValue({ ok: true, json: async () => projects });

      const result = await modrinth.getProjects(['sodium', 'lithium']);

      expect(result).toEqual(projects);
    });
  });

  // ---------------------------------------------------------------------------
  // getVersions
  // ---------------------------------------------------------------------------

  describe('getVersions', () => {
    it('calls /project/{id}/version endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersions('sodium', 'fabric', '1.21.1');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/project/sodium/version');
    });

    it('includes loaders param when loader is provided', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersions('sodium', 'fabric', '');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('loaders=');
    });

    it('omits loaders param when loader is empty string', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersions('sodium', '', '');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('loaders=');
    });

    it('includes game_versions param when version is provided', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersions('sodium', '', '1.21.1');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('game_versions=');
    });

    it('omits game_versions param when version is empty string', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersions('sodium', '', '');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('game_versions=');
    });

    it('returns the array of versions', async () => {
      const versions = [{ id: 'v1', version_number: '0.5.0' }];
      mockFetch.mockResolvedValue({ ok: true, json: async () => versions });

      const result = await modrinth.getVersions('sodium', 'fabric', '1.21.1');

      expect(result).toEqual(versions);
    });
  });

  // ---------------------------------------------------------------------------
  // getVersionsBulk
  // ---------------------------------------------------------------------------

  describe('getVersionsBulk', () => {
    it('calls /versions with ids param', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getVersionsBulk(['v1', 'v2']);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/versions');
      expect(calledUrl).toContain('ids=');
    });

    it('returns array of version objects', async () => {
      const versions = [{ id: 'v1' }, { id: 'v2' }];
      mockFetch.mockResolvedValue({ ok: true, json: async () => versions });

      const result = await modrinth.getVersionsBulk(['v1', 'v2']);

      expect(result).toEqual(versions);
    });
  });

  // ---------------------------------------------------------------------------
  // getVersionFile  (special: calls fetch directly, not via request())
  // ---------------------------------------------------------------------------

  describe('getVersionFile', () => {
    it('returns null when the hash is not found (404)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await modrinth.getVersionFile('deadbeef');

      expect(result).toBeNull();
    });

    it('returns version data when the hash is found', async () => {
      const versionData = { id: 'v1', version_number: '0.5.0', files: [] };
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => versionData });

      const result = await modrinth.getVersionFile('deadbeef');

      expect(result).toEqual(versionData);
    });

    it('throws ApiError for non-404 HTTP errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(modrinth.getVersionFile('deadbeef')).rejects.toBeInstanceOf(ApiError);
    });

    it('calls the version_file endpoint with the sha1 algorithm query', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

      await modrinth.getVersionFile('deadbeef');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/version_file/deadbeef');
      expect(calledUrl).toContain('algorithm=sha1');
    });

    it('forwards AbortSignal', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
      const controller = new AbortController();

      await modrinth.getVersionFile('deadbeef', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getGameVersions
  // ---------------------------------------------------------------------------

  describe('getGameVersions', () => {
    it('calls /tag/game_version endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getGameVersions();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/tag/game_version');
    });

    it('returns the array of game versions', async () => {
      const versions = [{ version: '1.21.1', version_type: 'release' }];
      mockFetch.mockResolvedValue({ ok: true, json: async () => versions });

      const result = await modrinth.getGameVersions();

      expect(result).toEqual(versions);
    });
  });

  // ---------------------------------------------------------------------------
  // getCategories
  // ---------------------------------------------------------------------------

  describe('getCategories', () => {
    it('calls /tag/category endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

      await modrinth.getCategories();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/tag/category');
    });

    it('returns the array of categories', async () => {
      const cats = [{ name: 'optimization', project_type: 'mod' }];
      mockFetch.mockResolvedValue({ ok: true, json: async () => cats });

      const result = await modrinth.getCategories();

      expect(result).toEqual(cats);
    });
  });
});
