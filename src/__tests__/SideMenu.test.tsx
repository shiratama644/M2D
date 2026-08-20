import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SideMenu from '@/components/layout/SideMenu';
import { EngineProvider } from '@/engine/react/EngineProvider';
import { startAppEngine, __resetEngine } from '@/engine';
import { useAppStore } from '@/store/useAppStore';

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

beforeEach(() => {
  __resetEngine();
  startAppEngine();
  useAppStore.getState().clearMods();
  useAppStore.getState().saveProfiles([]);
  useAppStore.getState().setMenuOpen(true);
  useAppStore.setState({
    showAlert: vi.fn().mockResolvedValue(undefined),
    showConfirm: vi.fn().mockResolvedValue(true),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SideMenu', () => {
  it('alerts when saving without a name or selection', async () => {
    render(
      <EngineProvider>
        <SideMenu />
      </EngineProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: useAppStore.getState().t.profiles.save }));
    await waitFor(() => expect(useAppStore.getState().showAlert).toHaveBeenCalled());
  });

  it('saves the current selection as a profile', async () => {
    useAppStore.getState().addMod('sodium');
    render(
      <EngineProvider>
        <SideMenu />
      </EngineProvider>,
    );
    fireEvent.change(screen.getByPlaceholderText(useAppStore.getState().t.profiles.namePlaceholder), {
      target: { value: 'RPG' },
    });
    fireEvent.click(screen.getByRole('button', { name: useAppStore.getState().t.profiles.save }));
    await waitFor(() => expect(useAppStore.getState().profiles[0]?.name).toBe('RPG'));
    expect(useAppStore.getState().profiles[0]?.mods).toEqual(['sodium']);
  });

  it('loads a profile after confirm', async () => {
    useAppStore.getState().saveProfiles([{ name: 'RPG', mods: ['lithium'], date: '2024-01-01' }]);
    render(
      <EngineProvider>
        <SideMenu />
      </EngineProvider>,
    );
    fireEvent.click(screen.getByTitle(useAppStore.getState().t.profiles.load));
    await waitFor(() => expect(useAppStore.getState().selectedMods.has('lithium')).toBe(true));
  });
});
