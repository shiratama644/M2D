import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import { useDependencyCheck, type SearchParams } from '@/hooks/useDependencyCheck';
import type { ModVersion } from '@/types/modrinth';

vi.mock('@/lib/api', () => ({
  API: {
    getProjects: vi.fn(),
    getVersions: vi.fn(),
    getVersionsBulk: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

function version(partial: Partial<ModVersion> & { project_id: string }): ModVersion {
  return {
    id: `${partial.project_id}-v`,
    name: partial.project_id,
    version_number: '1.0.0',
    version_type: 'release',
    files: [],
    dependencies: [],
    game_versions: ['1.21.1'],
    loaders: ['fabric'],
    date_published: '2024-01-01',
    ...partial,
  };
}

const search: SearchParams = {
  query: '',
  sort: 'relevance',
  filters: { loaders: {}, version: '' },
};

describe('useDependencyCheck', () => {
  beforeEach(() => {
    useAppStore.getState().clearMods();
    useAppStore.getState().clearDebugLogs();
    useAppStore.getState().hideLoading();
    useAppStore.getState().setDepModalOpen(false);
    useAppStore.setState({ modDataMap: {} });
    vi.mocked(API.getProjects).mockReset();
    vi.mocked(API.getVersions).mockReset();
    vi.mocked(API.getVersionsBulk).mockReset();
    vi.mocked(API.getProjects).mockResolvedValue([]);
    vi.mocked(API.getVersionsBulk).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns immediately when nothing is selected', async () => {
    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: true, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });
    expect(resolveSettings).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not run when resolveSettings cancels', async () => {
    useAppStore.getState().addMod('sodium');
    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: false, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });
    expect(API.getVersions).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('reports a missing required dependency and opens the modal', async () => {
    useAppStore.getState().addMod('sodium');
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Sodium' } });
    vi.mocked(API.getVersions).mockResolvedValue([
      version({
        project_id: 'sodium',
        dependencies: [{ project_id: 'indium', version_id: null, dependency_type: 'required' }],
      }),
    ]);
    vi.mocked(API.getProjects).mockResolvedValue([
      { id: 'indium', slug: 'indium', title: 'Indium', description: '', body: '', icon_url: null, gallery: [] },
    ]);

    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: true, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });

    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult.mock.calls[0][0].required).toEqual([
      { source: 'Sodium', targetId: 'indium' },
    ]);
    expect(useAppStore.getState().depModalOpen).toBe(true);
    expect(API.getProjects).toHaveBeenCalled();
  });

  it('resolves version-only dependencies via getVersionsBulk', async () => {
    useAppStore.getState().addMod('a');
    useAppStore.getState().updateModDataMap({ a: { title: 'A' } });
    vi.mocked(API.getVersions).mockResolvedValue([
      version({
        project_id: 'a',
        dependencies: [{ project_id: null, version_id: 'ver-dep', dependency_type: 'optional' }],
      }),
    ]);
    vi.mocked(API.getVersionsBulk).mockResolvedValue([
      version({ id: 'ver-dep', project_id: 'b', version_number: '2.0.0' }),
    ]);

    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: true, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });

    expect(API.getVersionsBulk).toHaveBeenCalledWith(['ver-dep']);
    expect(onResult.mock.calls[0][0].optional[0].targetId).toBe('b');
  });

  it('continues when getVersions fails for a project', async () => {
    useAppStore.getState().addMod('broken');
    vi.mocked(API.getVersions).mockRejectedValue(new Error('boom'));
    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: true, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });
    expect(onResult).toHaveBeenCalledWith({ required: [], optional: [], conflict: [] });
    expect(useAppStore.getState().debugLogs.some((l) => l.level === 'error')).toBe(true);
  });

  it('fetches missing source names before analysing versions', async () => {
    useAppStore.getState().addMod('unknown');
    vi.mocked(API.getProjects).mockResolvedValueOnce([
      { id: 'unknown', slug: 'unknown', title: 'Unknown Mod', description: '', body: '', icon_url: null, gallery: [] },
    ]);
    vi.mocked(API.getVersions).mockResolvedValue([version({ project_id: 'unknown' })]);

    const onResult = vi.fn();
    const resolveSettings = vi.fn().mockResolvedValue({ proceed: true, loader: 'fabric', version: '1.21.1' });
    const { result } = renderHook(() => useDependencyCheck(search, resolveSettings, onResult));
    await act(async () => {
      await result.current.handleCheckDeps();
    });

    expect(API.getProjects).toHaveBeenCalled();
    expect(useAppStore.getState().modDataMap).toHaveProperty('unknown');
  });
});
