import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAppEngine, __resetEngine, getEngine } from '@/engine';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import type { ModHit, ModProject, ModVersion } from '@/types/modrinth';

vi.mock('@/lib/api', () => ({
  API: {
    searchMods: vi.fn(),
    getProject: vi.fn(),
    getProjects: vi.fn(),
    getVersions: vi.fn(),
    getVersionsBulk: vi.fn(),
    getGameVersions: vi.fn(),
    getCategories: vi.fn(),
    getVersionFile: vi.fn(),
  },
}));

const hit: ModHit = {
  project_id: 'sodium',
  slug: 'sodium',
  title: 'Sodium',
  description: 'Fast',
  icon_url: null,
  author: 'jelly',
  downloads: 1,
};

const project: ModProject = {
  id: 'sodium',
  slug: 'sodium',
  title: 'Sodium',
  description: 'Fast',
  body: '',
  icon_url: null,
  gallery: [],
};

const version: ModVersion = {
  id: 'v1',
  project_id: 'sodium',
  name: '1.0',
  version_number: '1.0.0',
  files: [],
  dependencies: [],
  game_versions: ['1.21.1'],
  loaders: ['fabric'],
  date_published: '2024-01-01',
};

describe('catalog feature', () => {
  beforeEach(() => {
    __resetEngine();
    startAppEngine();
    useAppStore.setState({ modDataMap: {} });
    useAppStore.getState().saveProfiles([]);
    vi.mocked(API.searchMods).mockReset();
    vi.mocked(API.getProject).mockReset();
    vi.mocked(API.getProjects).mockReset();
    vi.mocked(API.getVersions).mockReset();
    vi.mocked(API.getVersionsBulk).mockReset();
    vi.mocked(API.getGameVersions).mockReset();
    vi.mocked(API.getCategories).mockReset();
    vi.mocked(API.getVersionFile).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writes search hits into the data map', async () => {
    vi.mocked(API.searchMods).mockResolvedValue({ hits: [hit], offset: 0, limit: 12, total_hits: 1 });
    const data = await getEngine().dispatch('catalog.search', {
      query: 'sodium',
      facets: [],
      offset: 0,
      limit: 12,
      index: 'relevance',
    });
    expect(data?.hits).toHaveLength(1);
    expect(useAppStore.getState().modDataMap.sodium).toMatchObject({ title: 'Sodium' });
    expect(API.searchMods).toHaveBeenCalled();
  });

  it('writes a project and a project list into the data map', async () => {
    vi.mocked(API.getProject).mockResolvedValue(project);
    vi.mocked(API.getProjects).mockResolvedValue([project]);
    await getEngine().dispatch('catalog.project', { id: 'sodium' });
    expect(useAppStore.getState().modDataMap.sodium).toMatchObject({ title: 'Sodium' });
    useAppStore.setState({ modDataMap: {} });
    await getEngine().dispatch('catalog.projects', { ids: ['sodium'] });
    expect(useAppStore.getState().modDataMap.sodium).toMatchObject({ title: 'Sodium' });
  });

  it('forwards the remaining catalog commands to the mocked API', async () => {
    vi.mocked(API.getVersions).mockResolvedValue([version]);
    vi.mocked(API.getVersionsBulk).mockResolvedValue([version]);
    vi.mocked(API.getGameVersions).mockResolvedValue([{ version: '1.21.1', version_type: 'release' }]);
    vi.mocked(API.getCategories).mockResolvedValue([]);
    vi.mocked(API.getVersionFile).mockResolvedValue(version);

    await getEngine().dispatch('catalog.versions', { id: 'sodium', loader: 'fabric', version: '1.21.1' });
    await getEngine().dispatch('catalog.versionsBulk', { ids: ['v1'] });
    await getEngine().dispatch('catalog.gameVersions', {});
    await getEngine().dispatch('catalog.categories', {});
    await getEngine().dispatch('catalog.versionFile', { hash: 'abc' });

    expect(API.getVersions).toHaveBeenCalledWith('sodium', 'fabric', '1.21.1', undefined);
    expect(API.getVersionsBulk).toHaveBeenCalledWith(['v1'], undefined);
    expect(API.getVersionFile).toHaveBeenCalledWith('abc', undefined);
  });

  it('renames, deletes, and imports profiles through events', async () => {
    const engine = getEngine();
    useAppStore.getState().addMod('sodium');
    await engine.emit('profiles.save', { name: 'RPG' });
    await engine.emit('profiles.rename', { index: 0, name: 'Magic' });
    expect(useAppStore.getState().profiles[0]?.name).toBe('Magic');
    await engine.emit('profiles.import', { name: 'Imported', mods: ['lithium'] });
    expect(useAppStore.getState().profiles).toHaveLength(2);
    await engine.emit('profiles.delete', { index: 0 });
    expect(useAppStore.getState().profiles.map((p) => p.name)).toEqual(['Imported']);
  });

  it('replaces the selection and sets discover type', async () => {
    const engine = getEngine();
    await engine.emit('selection.replace', { ids: ['a', 'b'] });
    expect([...useAppStore.getState().selectedMods]).toEqual(['a', 'b']);
    await engine.emit('discover.set', { type: 'shader' });
    expect(useAppStore.getState().discoverType).toBe('shader');
  });
});
