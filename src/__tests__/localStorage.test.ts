import { describe, it, expect, beforeEach } from 'vitest';
import { persistGet, persistSet, persistRemove, __resetPersist } from '@/lib/persist';

beforeEach(() => {
  __resetPersist();
});

describe('persist', () => {
  it('returns null for missing keys', () => {
    expect(persistGet('missing')).toBeNull();
  });

  it('round-trips string values in memory', () => {
    persistSet('k', 'v');
    expect(persistGet('k')).toBe('v');
  });

  it('remove deletes the key', () => {
    persistSet('k', 'v');
    persistRemove('k');
    expect(persistGet('k')).toBeNull();
  });
});
