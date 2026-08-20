import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EngineProvider, useEngine } from '@/engine/react/EngineProvider';
import { __resetEngine, startAppEngine } from '@/engine';
import { useAppStore } from '@/store/useAppStore';
import ActionBar from '@/components/search/ActionBar';
import Header from '@/components/layout/Header';
import SettingsContent from '@/components/settings/SettingsContent';
import HistoryTab from '@/components/panels/HistoryTab';
import FavoritesTab from '@/components/panels/FavoritesTab';
import SelectedTab from '@/components/panels/SelectedTab';
import { API } from '@/lib/api';

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ''} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({
  API: {
    getProjects: vi.fn().mockResolvedValue([]),
    searchMods: vi.fn(),
    getProject: vi.fn(),
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

function wrap(ui: ReactNode) {
  return render(<EngineProvider>{ui}</EngineProvider>);
}

describe('engine-wired UI', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    __resetEngine();
    startAppEngine();
    useAppStore.getState().clearMods();
    useAppStore.getState().clearFavorites();
    useAppStore.getState().clearSearchHistory();
    useAppStore.getState().clearContextHistory();
    useAppStore.getState().setMenuOpen(false);
    useAppStore.getState().setSettingsOpen(false);
    useAppStore.getState().setHistoryModalOpen(false);
    useAppStore.getState().setFavoritesModalOpen(false);
    useAppStore.getState().setSelectedModalOpen(false);
    useAppStore.getState().toggleTheme('dark');
    useAppStore.getState().toggleLanguage('en');
    useAppStore.getState().toggleDebug(false);
    useAppStore.getState().toggleFastSearch(false);
    useAppStore.getState().toggleShowCardDescription(false);
    useAppStore.getState().toggleAdvancedConsole(false);
    useAppStore.setState({
      showConfirm: vi.fn().mockResolvedValue(true),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when useEngine is used outside the provider', () => {
    function Probe() {
      useEngine();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/EngineProvider/);
  });

  it('clears the selection from ActionBar', async () => {
    useAppStore.getState().addMod('sodium');
    wrap(<ActionBar onCheckDeps={() => undefined} onDownload={() => undefined} />);
    fireEvent.click(screen.getByText('Clear All'));
    await waitFor(() => expect(useAppStore.getState().selectedMods.size).toBe(0));
  });

  it('opens chrome panels from the header', async () => {
    wrap(<Header />);
    fireEvent.click(screen.getByLabelText('History'));
    await waitFor(() => expect(useAppStore.getState().historyModalOpen).toBe(true));
    fireEvent.click(screen.getByLabelText('Favorites'));
    await waitFor(() => expect(useAppStore.getState().favoritesModalOpen).toBe(true));
    fireEvent.click(screen.getByLabelText('Selected mods'));
    await waitFor(() => expect(useAppStore.getState().selectedModalOpen).toBe(true));
    fireEvent.click(screen.getByLabelText('Settings'));
    await waitFor(() => expect(useAppStore.getState().settingsOpen).toBe(true));
    fireEvent.click(document.querySelector('.hamburger-btn') as HTMLButtonElement);
    await waitFor(() => expect(useAppStore.getState().menuOpen).toBe(true));
  });

  it('writes settings flags and theme from SettingsContent', async () => {
    wrap(<SettingsContent gameVersions={[{ version: '1.21.1', version_type: 'release' }]} />);
    const toggles = screen.getAllByRole('checkbox');
    fireEvent.click(toggles[0]);
    await waitFor(() => expect(useAppStore.getState().fastSearch).toBe(true));
    fireEvent.click(toggles[1]);
    await waitFor(() => expect(useAppStore.getState().showCardDescription).toBe(true));
    fireEvent.click(toggles[2]);
    await waitFor(() => expect(useAppStore.getState().debugMode).toBe(true));
    fireEvent.click(toggles[3]);
    await waitFor(() => expect(useAppStore.getState().advancedConsole).toBe(true));

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[2]);
    fireEvent.click(screen.getByRole('option', { name: /Light/i }));
    await waitFor(() => expect(useAppStore.getState().theme).toBe('light'));
  });

  it('clears history and favorites from settings after confirm', async () => {
    useAppStore.getState().addSearchHistory('sodium');
    useAppStore.getState().toggleFavorite('lithium');
    wrap(<SettingsContent gameVersions={[]} />);
    const clears = screen.getAllByRole('button', { name: 'Clear' });
    fireEvent.click(clears[0]);
    await waitFor(() => expect(useAppStore.getState().searchHistory).toEqual([]));
    fireEvent.click(clears[1]);
    await waitFor(() => expect(useAppStore.getState().favorites.size).toBe(0));
  });

  it('removes and clears history entries from HistoryTab', async () => {
    useAppStore.getState().addContextHistory({
      query: 'keep-me',
      sort: 'relevance',
      filters: { loaders: {} },
      projectType: 'mod',
    });
    useAppStore.getState().addContextHistory({
      query: 'drop-me',
      sort: 'relevance',
      filters: { loaders: {} },
      projectType: 'mod',
    });
    wrap(<HistoryTab onContextRestore={() => undefined} />);
    fireEvent.click(screen.getAllByTitle(useAppStore.getState().t.history.deleteEntry)[0]);
    await waitFor(() => expect(useAppStore.getState().contextHistory).toHaveLength(1));
    fireEvent.click(screen.getByText(useAppStore.getState().t.history.clear));
    await waitFor(() => expect(useAppStore.getState().contextHistory).toEqual([]));
  });

  it('adds a favorite to the selection from FavoritesTab', async () => {
    useAppStore.getState().toggleFavorite('sodium');
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Sodium', icon_url: null } });
    wrap(<FavoritesTab />);
    fireEvent.click(screen.getByText(useAppStore.getState().t.favorites.addToSelected));
    await waitFor(() => expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true));
    fireEvent.click(screen.getByText('✕'));
    await waitFor(() => expect(useAppStore.getState().favorites.has('sodium')).toBe(false));
  });

  it('removes a selected mod from SelectedTab', async () => {
    useAppStore.getState().addMod('sodium');
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Sodium', icon_url: null } });
    wrap(<SelectedTab />);
    fireEvent.click(screen.getByText('Manage'));
    await waitFor(() => expect(useAppStore.getState().selectedModalOpen).toBe(true));
    fireEvent.click(screen.getByText('✕'));
    await waitFor(() => expect(useAppStore.getState().selectedMods.size).toBe(0));
  });
});
