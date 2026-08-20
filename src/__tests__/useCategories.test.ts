import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { __resetCategoryCache, useCategories, useCategoryGroups } from '@/hooks/useCategories';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import { startAppEngine, __resetEngine } from '@/engine';
import type { ModCategory } from '@/types/modrinth';

vi.mock('@/lib/api', () => ({
  API: {
    getCategories: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

const sample: ModCategory[] = [
  { name: 'utility', header: 'categories', project_type: 'mod', icon: '' },
  { name: 'adventure', header: 'categories', project_type: 'mod', icon: '' },
  { name: 'pbr', header: 'features', project_type: 'shader', icon: '' },
];

describe('useCategories', () => {
  beforeEach(() => {
    __resetEngine();
    startAppEngine();
    __resetCategoryCache();
    useAppStore.getState().clearDebugLogs();
    vi.mocked(API.getCategories).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('filters and sorts categories for the requested project type', async () => {
    vi.mocked(API.getCategories).mockResolvedValue(sample);
    const { result } = renderHook(() => useCategories('mod'));
    await waitFor(() => expect(result.current.map((c) => c.name)).toEqual(['adventure', 'utility']));
  });

  it('reuses the module cache on a second mount', async () => {
    vi.mocked(API.getCategories).mockResolvedValue(sample);
    const first = renderHook(() => useCategories('mod'));
    await waitFor(() => expect(first.result.current.length).toBe(2));
    first.unmount();

    const second = renderHook(() => useCategories('mod'));
    expect(second.result.current.map((c) => c.name)).toEqual(['adventure', 'utility']);
    expect(API.getCategories).toHaveBeenCalledOnce();
  });

  it('logs when the request fails', async () => {
    vi.mocked(API.getCategories).mockRejectedValue(new Error('down'));
    renderHook(() => useCategories('mod'));
    await waitFor(() =>
      expect(useAppStore.getState().debugLogs.some((l) => l.msg.includes('Failed to load categories'))).toBe(true),
    );
  });
});

describe('useCategoryGroups', () => {
  beforeEach(() => {
    __resetEngine();
    startAppEngine();
    __resetCategoryCache();
    vi.mocked(API.getCategories).mockResolvedValue(sample);
  });

  it('groups filtered categories by header', async () => {
    const { result } = renderHook(() => useCategoryGroups('mod'));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].header).toBe('categories');
    expect(result.current[0].items).toHaveLength(2);
  });
});
