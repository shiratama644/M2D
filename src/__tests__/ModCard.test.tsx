import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModCard from '@/components/mods/ModCard';
import { EngineProvider } from '@/engine/react/EngineProvider';
import { __resetEngine } from '@/engine/Engine';
import { useAppStore } from '@/store/useAppStore';
import type { ModHit } from '@/types/modrinth';

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

const mod: ModHit = {
  project_id: 'sodium',
  title: 'Sodium',
  description: 'Fast rendering',
  icon_url: null,
  author: 'jellysquid',
  downloads: 12_000,
};

describe('ModCard', () => {
  beforeEach(() => {
    __resetEngine();
    useAppStore.getState().clearMods();
    useAppStore.getState().clearFavorites();
    useAppStore.getState().setActiveModId(null);
    useAppStore.getState().toggleShowCardDescription(false);
  });

  it('selects the mod when the checkbox is toggled', () => {
    render(<EngineProvider><ModCard mod={mod} isDesktop /></EngineProvider>);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
  });

  it('activates the card on click without selecting', () => {
    render(<EngineProvider><ModCard mod={mod} isDesktop /></EngineProvider>);
    fireEvent.click(screen.getByRole('listitem', { name: 'Sodium' }));
    expect(useAppStore.getState().activeModId).toBe('sodium');
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(false);
  });

  it('toggles favorite from the star button', () => {
    render(<EngineProvider><ModCard mod={mod} isDesktop /></EngineProvider>);
    fireEvent.click(screen.getByTitle('Add to favorites'));
    expect(useAppStore.getState().favorites.has('sodium')).toBe(true);
  });

  it('shows the description when that setting is on', () => {
    useAppStore.getState().toggleShowCardDescription(true);
    render(<EngineProvider><ModCard mod={mod} isDesktop /></EngineProvider>);
    expect(screen.getByText('Fast rendering')).toBeTruthy();
  });
});
