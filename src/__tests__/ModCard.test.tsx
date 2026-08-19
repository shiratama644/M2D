import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModCard from '@/components/mods/ModCard';
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
    useAppStore.getState().clearMods();
    useAppStore.getState().clearFavorites();
    useAppStore.getState().setActiveModId(null);
    useAppStore.getState().toggleShowCardDescription(false);
  });

  it('selects the mod when the checkbox is toggled', () => {
    render(<ModCard mod={mod} isDesktop />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
  });

  it('activates the card on click without selecting', () => {
    render(<ModCard mod={mod} isDesktop />);
    fireEvent.click(screen.getByRole('listitem', { name: 'Sodium' }));
    expect(useAppStore.getState().activeModId).toBe('sodium');
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(false);
  });

  it('toggles favorite from the star button', () => {
    render(<ModCard mod={mod} isDesktop />);
    fireEvent.click(screen.getByTitle('Add to favorites'));
    expect(useAppStore.getState().favorites.has('sodium')).toBe(true);
  });

  it('shows the description when that setting is on', () => {
    useAppStore.getState().toggleShowCardDescription(true);
    render(<ModCard mod={mod} isDesktop />);
    expect(screen.getByText('Fast rendering')).toBeTruthy();
  });
});
