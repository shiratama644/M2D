import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterRow from '@/components/ui/FilterRow';
import { useAppStore } from '@/store/useAppStore';

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

describe('FilterRow', () => {
  it('marks the include button active and toggles both states', () => {
    const onToggle = vi.fn();
    render(createElement(FilterRow, { label: 'Fabric', state: 'include', onToggle }));
    const include = screen.getByTitle(useAppStore.getState().t.filters.include);
    const exclude = screen.getByTitle(useAppStore.getState().t.filters.exclude);
    expect(include.className).toContain('active-include');
    expect(exclude.className).not.toContain('active-exclude');
    fireEvent.click(exclude);
    expect(onToggle).toHaveBeenCalledWith('exclude');
    fireEvent.click(include);
    expect(onToggle).toHaveBeenCalledWith('include');
  });
});
