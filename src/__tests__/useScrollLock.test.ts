import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock, __resetScrollLock } from '@/hooks/useScrollLock';

afterEach(() => {
  __resetScrollLock();
});

describe('useScrollLock', () => {
  it('adds modal-open while active and removes it on unmount', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.classList.contains('modal-open')).toBe(true);
    unmount();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('does not lock when inactive', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('keeps the class until the last lock is released', () => {
    const a = renderHook(() => useScrollLock(true));
    const b = renderHook(() => useScrollLock(true));
    expect(document.body.classList.contains('modal-open')).toBe(true);
    a.unmount();
    expect(document.body.classList.contains('modal-open')).toBe(true);
    b.unmount();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });
});
