import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ModList from '@/components/mods/ModList';
import { EngineProvider } from '@/engine/react/EngineProvider';
import { startAppEngine, __resetEngine } from '@/engine';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import type { ModHit } from '@/types/modrinth';
import type { SearchParams } from '@/hooks/useDependencyCheck';

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

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

const emptySearch: SearchParams = {
  query: '',
  sort: 'relevance',
  filters: { loaders: {}, version: '' },
};

const sodium: ModHit = {
  project_id: 'sodium',
  title: 'Sodium',
  description: 'Fast',
  icon_url: null,
  author: 'jelly',
  downloads: 1,
  slug: 'sodium',
};

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  __resetEngine();
  startAppEngine();
  useAppStore.getState().clearMods();
  useAppStore.getState().clearDebugLogs();
  vi.mocked(API.searchMods).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ModList', () => {
  it('renders server-provided mods and a popular heading', () => {
    render(
      <EngineProvider>
        <ModList searchParams={emptySearch} isDesktop initialMods={[sodium]} />
      </EngineProvider>,
    );
    expect(screen.getByText('Sodium')).toBeTruthy();
    expect(screen.getByText(useAppStore.getState().t.modList.popular)).toBeTruthy();
  });

  it('shows the empty copy when the initial list is empty', () => {
    render(
      <EngineProvider>
        <ModList searchParams={emptySearch} isDesktop initialMods={[]} />
      </EngineProvider>,
    );
    expect(screen.getByText(useAppStore.getState().t.empty.noMods)).toBeTruthy();
  });

  it('shows a retry button when catalog search fails', async () => {
    vi.mocked(API.searchMods).mockRejectedValueOnce(new Error('down'));
    render(
      <EngineProvider>
        <ModList searchParams={emptySearch} isDesktop initialMods={null} />
      </EngineProvider>,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(useAppStore.getState().t.modList.fetchError)).toBeTruthy();
    vi.mocked(API.searchMods).mockResolvedValue({ hits: [sodium], offset: 0, limit: 12, total_hits: 1 });
    fireEvent.click(screen.getByRole('button', { name: useAppStore.getState().t.modList.retry }));
    await waitFor(() => expect(screen.getByText('Sodium')).toBeTruthy());
  });
});
