import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('starts with the initial value when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('flag', false));
    expect(result.current[0]).toBe(false);
  });

  it('reads boolean strings from storage', () => {
    localStorage.setItem('flag', 'true');
    const { result } = renderHook(() => useLocalStorage('flag', false));
    expect(result.current[0]).toBe(true);
  });

  it('parses JSON objects', () => {
    localStorage.setItem('obj', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useLocalStorage('obj', { a: 0 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('setValue writes primitives and updater functions', () => {
    const { result } = renderHook(() => useLocalStorage('n', 1));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem('n')).toBe('2');

    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(3);
  });

  it('setValue JSON-stringifies objects', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { a: 0 }));
    act(() => result.current[1]({ a: 9 }));
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ a: 9 });
  });

  it('removeValue restores the initial value', () => {
    const { result } = renderHook(() => useLocalStorage('n', 0));
    act(() => result.current[1](5));
    act(() => result.current[2]());
    expect(result.current[0]).toBe(0);
    expect(localStorage.getItem('n')).toBeNull();
  });
});
