import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import { useAppStore } from '@/store/useAppStore';

vi.mock('@/context/AppContext', async () => {
  const { useAppStore } = await vi.importActual<typeof import('@/store/useAppStore')>('@/store/useAppStore');
  return { useApp: useAppStore, useAppStore };
});

describe('LoadingOverlay', () => {
  it('renders nothing when loading is hidden', () => {
    useAppStore.getState().hideLoading();
    const { container } = render(createElement(LoadingOverlay));
    expect(container.firstChild).toBeNull();
  });

  it('shows text and progress when visible', () => {
    useAppStore.getState().showLoading('Working');
    useAppStore.getState().showProgress(10);
    useAppStore.getState().updateProgress(5, 10, Date.now() - 1000);
    render(createElement(LoadingOverlay));
    expect(screen.getByText('Working')).toBeTruthy();
    expect(screen.getByText('5 / 10')).toBeTruthy();
    useAppStore.getState().hideLoading();
  });
});
