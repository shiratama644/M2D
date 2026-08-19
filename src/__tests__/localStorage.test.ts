import { describe, it, expect, beforeEach } from 'vitest';
import { ls } from '@/lib/localStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('ls', () => {
  it('returns null for missing keys', () => {
    expect(ls.get('missing')).toBeNull();
  });

  it('round-trips string values', () => {
    ls.set('k', 'v');
    expect(ls.get('k')).toBe('v');
  });

  it('remove deletes the key', () => {
    ls.set('k', 'v');
    ls.remove('k');
    expect(ls.get('k')).toBeNull();
  });
});
