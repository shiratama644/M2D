import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import type { SearchParams } from '@/hooks/useDependencyCheck';
import type { ModVersion } from '@/types/modrinth';

const saveAs = vi.fn();

vi.mock('file-saver', () => ({
  saveAs: (...args: unknown[]) => saveAs(...args),
}));

vi.mock('jszip', () => {
  return {
    default: class MockZip {
      file = vi.fn();
      generateAsync = vi.fn(async (_opts: unknown, onUpdate?: (meta: { percent: number }) => void) => {
        onUpdate?.({ percent: 100 });
        return new Blob(['zip']);
      });
    },
  };
});

vi.mock('@/lib/api', () => ({
  API: {
    getVersions: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

function releaseVersion(overrides: Partial<ModVersion> = {}): ModVersion {
  return {
    id: 'v1',
    project_id: 'sodium',
    name: 'Sodium 1.0.0',
    version_number: '1.0.0',
    version_type: 'release',
    files: [
      {
        url: 'https://cdn.example/sodium.jar',
        filename: 'sodium.jar',
        primary: true,
        size: 10,
      },
    ],
    dependencies: [],
    game_versions: ['1.21.1'],
    loaders: ['fabric'],
    date_published: '2024-01-01',
    ...overrides,
  };
}

const emptySearch: SearchParams = {
  query: '',
  sort: 'relevance',
  filters: { loaders: {}, version: '' },
};

describe('useModDownload', () => {
  beforeEach(() => {
    saveAs.mockReset();
    vi.mocked(API.getVersions).mockReset();
    useAppStore.getState().clearMods();
    useAppStore.getState().clearDebugLogs();
    useAppStore.getState().hideLoading();
    useAppStore.setState({ modDataMap: {} });
    useAppStore.getState().updateModLoader('fabric');
    useAppStore.getState().updateModVersion('1.21.1');
    useAppStore.setState({
      showAlert: vi.fn().mockResolvedValue(undefined),
      showConfirm: vi.fn().mockResolvedValue(true),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['jar']),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does nothing when no mods are selected', async () => {
    const { useModDownload } = await import('@/hooks/useModDownload');
    const { result } = renderHook(() => useModDownload(emptySearch));
    await act(async () => {
      await result.current.handleDownload();
    });
    expect(API.getVersions).not.toHaveBeenCalled();
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('zips a successful download and calls saveAs', async () => {
    useAppStore.getState().addMod('sodium');
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Sodium' } });
    vi.mocked(API.getVersions).mockResolvedValue([releaseVersion()]);

    const { useModDownload } = await import('@/hooks/useModDownload');
    const { result } = renderHook(() => useModDownload(emptySearch));
    await act(async () => {
      await result.current.handleDownload();
    });

    expect(saveAs).toHaveBeenCalledOnce();
    const filename = saveAs.mock.calls[0][1] as string;
    expect(filename).toMatch(/^mods-fabric-1\.21\.1-\d+\.zip$/);
    expect(useAppStore.getState().loading.visible).toBe(false);
  });

  it('alerts when no compatible versions can be downloaded', async () => {
    useAppStore.getState().addMod('sodium');
    vi.mocked(API.getVersions).mockResolvedValue([]);

    const { useModDownload } = await import('@/hooks/useModDownload');
    const { result } = renderHook(() => useModDownload(emptySearch));
    await act(async () => {
      await result.current.handleDownload();
    });

    expect(saveAs).not.toHaveBeenCalled();
    expect(useAppStore.getState().showAlert).toHaveBeenCalled();
  });

  it('logs a warning when the file HTTP response is not ok', async () => {
    useAppStore.getState().addMod('sodium');
    vi.mocked(API.getVersions).mockResolvedValue([releaseVersion()]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, blob: async () => new Blob() }));

    const { useModDownload } = await import('@/hooks/useModDownload');
    const { result } = renderHook(() => useModDownload(emptySearch));
    await act(async () => {
      await result.current.handleDownload();
    });

    expect(useAppStore.getState().debugLogs.some((l) => l.msg.includes('HTTP 500'))).toBe(true);
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('resolveDownloadSettings uses filter loader when it is the only include', async () => {
    useAppStore.getState().updateModLoader('fabric');
    const showConfirm = vi.spyOn(useAppStore.getState(), 'showConfirm').mockResolvedValue(true);

    const { useModDownload } = await import('@/hooks/useModDownload');
    const search: SearchParams = {
      query: '',
      sort: 'relevance',
      filters: { loaders: { forge: 'include', fabric: null }, version: '1.20.1' },
    };
    const { result } = renderHook(() => useModDownload(search));
    let resolved: Awaited<ReturnType<typeof result.current.resolveDownloadSettings>> | undefined;
    await act(async () => {
      resolved = await result.current.resolveDownloadSettings();
    });

    expect(showConfirm).toHaveBeenCalled();
    expect(resolved).toEqual({ proceed: true, loader: 'forge', version: '1.20.1' });
    showConfirm.mockRestore();
  });

  it('cancels download when the user rejects the mismatch confirm', async () => {
    const showConfirm = vi.spyOn(useAppStore.getState(), 'showConfirm').mockResolvedValue(false);
    const { useModDownload } = await import('@/hooks/useModDownload');
    const search: SearchParams = {
      query: '',
      sort: 'relevance',
      filters: { loaders: { forge: 'include' }, version: '' },
    };
    const { result } = renderHook(() => useModDownload(search));
    let resolved: Awaited<ReturnType<typeof result.current.resolveDownloadSettings>> | undefined;
    await act(async () => {
      resolved = await result.current.resolveDownloadSettings();
    });
    expect(resolved?.proceed).toBe(false);
    showConfirm.mockRestore();
  });
});
