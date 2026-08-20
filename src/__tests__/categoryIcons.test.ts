import { describe, it, expect } from 'vitest';
import { CATEGORY_ICON_MAP } from '@/lib/categoryIcons';

describe('CATEGORY_ICON_MAP', () => {
  it('maps common mod, pack, and shader category ids', () => {
    expect(CATEGORY_ICON_MAP).toHaveProperty('optimization');
    expect(CATEGORY_ICON_MAP).toHaveProperty('kitchen-sink');
    expect(CATEGORY_ICON_MAP).toHaveProperty('path-tracing');
    expect(CATEGORY_ICON_MAP).toHaveProperty('screenshot-utility');
  });

  it('stores string values (raw SVG mocks in tests)', () => {
    for (const [key, value] of Object.entries(CATEGORY_ICON_MAP)) {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('string');
    }
  });
});
