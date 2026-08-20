import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from '@/hooks/useIsDesktop';

type Listener = () => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mq = {
    matches: initial,
    addEventListener: (_type: string, cb: Listener) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: Listener) => {
      listeners.delete(cb);
    },
    dispatch(next: boolean) {
      mq.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
  const original = window.matchMedia;
  window.matchMedia = (() => mq) as unknown as typeof window.matchMedia;
  return {
    dispatch: (next: boolean) => mq.dispatch(next),
    restore: () => {
      window.matchMedia = original;
    },
  };
}

describe('useIsDesktop', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('returns the current matchMedia snapshot', () => {
    const stub = stubMatchMedia(true);
    restore = stub.restore;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const stub = stubMatchMedia(false);
    restore = stub.restore;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    act(() => stub.dispatch(true));
    expect(result.current).toBe(true);
  });
});
