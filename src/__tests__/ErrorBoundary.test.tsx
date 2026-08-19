import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when they do not throw', () => {
    render(
      createElement(ErrorBoundary, { fallback: createElement('p', null, 'fallback') }, createElement('p', null, 'ok')),
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('renders a static fallback after a child error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      createElement(ErrorBoundary, { fallback: createElement('p', null, 'fallback') }, createElement(Boom)),
    );
    expect(screen.getByText('fallback')).toBeTruthy();
    spy.mockRestore();
  });

  it('supports a render-prop fallback that can reset', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('boom');
      return createElement('p', null, 'recovered');
    }

    render(
      createElement(
        ErrorBoundary,
        {
          fallback: (reset: () => void) => createElement('button', { onClick: reset }, 'retry'),
        },
        createElement(MaybeBoom),
      ),
    );
    expect(screen.getByText('retry')).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(screen.getByText('retry'));
    expect(screen.getByText('recovered')).toBeTruthy();
    spy.mockRestore();
  });
});
