import { describe, it, expect } from 'vitest';
import {
  displayModTitle,
  indexProjects,
  isOpaqueModId,
  lookupMod,
} from '@/lib/modDisplay';

describe('isOpaqueModId', () => {
  it('detects 8-char Modrinth ids and hex hashes', () => {
    expect(isOpaqueModId('AANobbMI')).toBe(true);
    expect(isOpaqueModId('a'.repeat(40))).toBe(true);
    expect(isOpaqueModId('b'.repeat(64))).toBe(true);
    expect(isOpaqueModId('sodium')).toBe(false);
    expect(isOpaqueModId('iris-shaders')).toBe(false);
  });
});

describe('indexProjects / lookupMod', () => {
  it('indexes a project under both id and slug', () => {
    const map = indexProjects([
      { id: 'AANobbMI', slug: 'sodium', title: 'Sodium', icon_url: null },
    ]);
    expect(lookupMod(map, 'AANobbMI')?.title).toBe('Sodium');
    expect(lookupMod(map, 'sodium')?.title).toBe('Sodium');
  });
});

describe('displayModTitle', () => {
  const map = indexProjects([
    { id: 'AANobbMI', slug: 'sodium', title: 'Sodium' },
  ]);

  it('prefers the project title', () => {
    expect(displayModTitle(map, 'AANobbMI')).toBe('Sodium');
    expect(displayModTitle(map, 'sodium')).toBe('Sodium');
  });

  it('does not render a raw project id or hash', () => {
    expect(displayModTitle({}, 'AANobbMI')).toBe('Unknown mod');
    expect(displayModTitle({}, 'a'.repeat(40))).toBe('Unknown mod');
  });

  it('keeps human slugs when metadata is missing', () => {
    expect(displayModTitle({}, 'lithium')).toBe('lithium');
  });
});
