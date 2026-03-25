import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// cn  (clsx + tailwind-merge)
// ---------------------------------------------------------------------------

describe('cn', () => {
  it('returns a single class name unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple string arguments', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('ignores undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('ignores false and 0 (falsy values)', () => {
    expect(cn('foo', false && 'hidden', 'bar')).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind padding utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('deduplicates conflicting Tailwind text-color utilities (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('preserves non-conflicting utilities', () => {
    const result = cn('flex', 'items-center', 'gap-2');
    expect(result).toBe('flex items-center gap-2');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all-falsy arguments', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('merges conditional object with string arguments', () => {
    const active = true;
    expect(cn('base', { 'text-green-500': active })).toBe('base text-green-500');
  });
});
