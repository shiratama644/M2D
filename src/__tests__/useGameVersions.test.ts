import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameVersions } from '@/hooks/useGameVersions';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import { startAppEngine, __resetEngine } from '@/engine';

vi.mock('@/lib/api', () => ({
  API: {
    getGameVersions: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

describe('useGameVersions', () => {
  beforeEach(() => {
    __resetEngine();
    startAppEngine();
    useAppStore.getState().clearDebugLogs();
    vi.mocked(API.getGameVersions).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps only release versions', async () => {
    vi.mocked(API.getGameVersions).mockResolvedValue([
      { version: '1.21.1', version_type: 'release' },
      { version: '24w10a', version_type: 'snapshot' },
    ]);

    const { result } = renderHook(() => useGameVersions());
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].version).toBe('1.21.1');
  });

  it('logs a warning when the request fails', async () => {
    vi.mocked(API.getGameVersions).mockRejectedValue(new Error('network'));
    renderHook(() => useGameVersions());
    await waitFor(() => expect(useAppStore.getState().debugLogs.length).toBeGreaterThan(0));
    expect(useAppStore.getState().debugLogs.at(-1)?.msg).toMatch(/Failed to load game versions/);
  });

  it('does not log when the request is aborted on unmount', async () => {
    let rejectFn: ((err: unknown) => void) | undefined;
    vi.mocked(API.getGameVersions).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFn = reject;
        }),
    );

    const { unmount } = renderHook(() => useGameVersions());
    unmount();
    rejectFn?.(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await Promise.resolve();
    expect(useAppStore.getState().debugLogs).toHaveLength(0);
  });
});
