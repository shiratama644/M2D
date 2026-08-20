import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ModDetail from '@/components/mods/ModDetail';
import { EngineProvider } from '@/engine/react/EngineProvider';
import { startAppEngine, __resetEngine } from '@/engine';
import { useAppStore } from '@/store/useAppStore';
import { API } from '@/lib/api';
import type { ModProject } from '@/types/modrinth';

vi.mock('@/lib/api', () => ({
  API: {
    searchMods: vi.fn(),
    getProject: vi.fn(),
    getProjects: vi.fn(),
    getVersions: vi.fn().mockResolvedValue([]),
    getVersionsBulk: vi.fn(),
    getGameVersions: vi.fn(),
    getCategories: vi.fn(),
    getVersionFile: vi.fn(),
  },
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ''} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

const project: ModProject = {
  id: 'sodium',
  slug: 'sodium',
  title: 'Sodium',
  description: 'Fast rendering',
  body: '## Hello',
  icon_url: null,
  gallery: [],
};

beforeEach(() => {
  __resetEngine();
  startAppEngine();
  useAppStore.getState().setActiveModId(null);
  vi.mocked(API.getProject).mockReset();
  vi.mocked(API.getVersions).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ModDetail', () => {
  it('asks the user to pick a mod when none is active', () => {
    render(
      <EngineProvider>
        <ModDetail />
      </EngineProvider>,
    );
    expect(screen.getByText(useAppStore.getState().t.empty.selectModHint)).toBeTruthy();
  });

  it('loads project details through the catalog command', async () => {
    vi.mocked(API.getProject).mockResolvedValue(project);
    useAppStore.getState().setActiveModId('sodium');
    render(
      <EngineProvider>
        <ModDetail />
      </EngineProvider>,
    );
    await waitFor(() => expect(screen.getByText('Sodium')).toBeTruthy());
    expect(screen.getByText('Fast rendering')).toBeTruthy();
    expect(API.getProject).toHaveBeenCalled();
  });
});
