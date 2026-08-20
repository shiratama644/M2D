import { describe, it, expect } from 'vitest';
import { getDiscoverOptions } from '@/lib/discoverOptions';
import translations from '@/i18n/translations';

describe('getDiscoverOptions', () => {
  it('returns the four project types in display order', () => {
    const options = getDiscoverOptions(translations.en);
    expect(options.map((o) => o.type)).toEqual(['mod', 'modpack', 'resourcepack', 'shader']);
    expect(options.every((o) => o.label && typeof o.icon === 'string')).toBe(true);
  });

  it('uses translated labels', () => {
    const ja = getDiscoverOptions(translations.ja);
    const en = getDiscoverOptions(translations.en);
    expect(ja[0].label).toBe(translations.ja.discover.mod);
    expect(en[0].label).toBe(translations.en.discover.mod);
  });
});
