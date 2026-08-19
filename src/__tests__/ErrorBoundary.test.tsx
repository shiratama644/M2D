import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when they do not throw', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <p>ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('renders a static fallback after a child error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeTruthy();
    spy.mockRestore();
  });

  it('supports a render-prop fallback that can reset', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('boom');
      return <p>recovered</p>;
    }

    render(
      <ErrorBoundary fallback={(reset) => <button onClick={reset}>retry</button>}>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('retry')).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(screen.getByText('retry'));
    expect(screen.getByText('recovered')).toBeTruthy();
    spy.mockRestore();
  });
});
