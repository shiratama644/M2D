import { describe, it, expect } from 'vitest';
import {
  asyncPool,
  formatNum,
  formatCategoryName,
  getCategoryLabel,
  getCategoryHeaderLabel,
  getLoaderOptions,
  countActiveFilters,
  LOADER_OPTIONS,
  SHADER_LOADER_OPTIONS,
  MAX_SEARCH_HISTORY,
  CONCURRENCY_LIMIT,
  FALLBACK_ICON,
  LEVEL_COLORS,
  ENVIRONMENT_OPTIONS,
} from '@/lib/helpers';

// ---------------------------------------------------------------------------
// asyncPool
// ---------------------------------------------------------------------------

describe('asyncPool', () => {
  it('resolves with results in input order', async () => {
    const results = await asyncPool(2, [1, 2, 3], async (n) => n * 2);
    expect(results).toEqual([2, 4, 6]);
  });

  it('handles an empty array', async () => {
    const results = await asyncPool(5, [], async (n: number) => n);
    expect(results).toEqual([]);
  });

  it('limits concurrency (at most poolLimit in-flight at once)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await asyncPool(3, items, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('propagates rejections', async () => {
    await expect(
      asyncPool(2, [1, 2], async (n) => {
        if (n === 2) throw new Error('fail');
        return n;
      }),
    ).rejects.toThrow('fail');
  });

  it('handles pool limit larger than array length', async () => {
    const results = await asyncPool(100, [10, 20], async (n) => n + 1);
    expect(results).toEqual([11, 21]);
  });

  it('handles pool limit of 1 (serial execution)', async () => {
    const order: number[] = [];
    await asyncPool(1, [1, 2, 3], async (n) => {
      order.push(n);
      return n;
    });
    expect(order).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// formatNum
// ---------------------------------------------------------------------------

describe('formatNum', () => {
  it('formats numbers below 1000 without suffix', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNum(1000)).toBe('1K');
    expect(formatNum(1200)).toBe('1.2K');
    expect(formatNum(1500)).toBe('1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNum(1_000_000)).toBe('1M');
    expect(formatNum(5_600_000)).toBe('5.6M');
  });

  it('formats billions with B suffix', () => {
    expect(formatNum(1_000_000_000)).toBe('1B');
  });

  it('formats negative numbers', () => {
    const result = formatNum(-1500);
    expect(result).toMatch(/[\-−]/); // locale may use U+2212 minus sign
    expect(result).toContain('1.5K');
  });
});

// ---------------------------------------------------------------------------
// formatCategoryName
// ---------------------------------------------------------------------------

describe('formatCategoryName', () => {
  it('converts hyphenated names to Title Case', () => {
    expect(formatCategoryName('path-tracing')).toBe('Path Tracing');
    expect(formatCategoryName('game-mechanics')).toBe('Game Mechanics');
  });

  it('converts underscore-separated names to Title Case', () => {
    expect(formatCategoryName('performance_impact')).toBe('Performance Impact');
  });

  it('handles single-word names', () => {
    expect(formatCategoryName('optimization')).toBe('Optimization');
  });

  it('handles names that are already title-cased', () => {
    expect(formatCategoryName('Magic')).toBe('Magic');
  });

  it('handles empty string', () => {
    expect(formatCategoryName('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getCategoryLabel
// ---------------------------------------------------------------------------

describe('getCategoryLabel', () => {
  const categories: Record<string, string> = {
    optimization: 'Optimization',
    gameMechanics: 'Game Mechanics',
    'path-tracing': 'Path Tracing',
  };

  it('returns direct lookup when key exists', () => {
    expect(getCategoryLabel('optimization', categories)).toBe('Optimization');
  });

  it('returns direct lookup for hyphenated key', () => {
    expect(getCategoryLabel('path-tracing', categories)).toBe('Path Tracing');
  });

  it('returns camelCase lookup for hyphenated name not found directly', () => {
    // 'game-mechanics' not in map, but 'gameMechanics' is
    expect(getCategoryLabel('game-mechanics', categories)).toBe('Game Mechanics');
  });

  it('falls back to formatCategoryName when no translation exists', () => {
    expect(getCategoryLabel('unknown-category', {})).toBe('Unknown Category');
  });

  it('handles underscore-to-camelCase conversion', () => {
    const cats = { performanceImpact: 'Performance Impact' };
    expect(getCategoryLabel('performance_impact', cats)).toBe('Performance Impact');
  });
});

// ---------------------------------------------------------------------------
// getCategoryHeaderLabel
// ---------------------------------------------------------------------------

describe('getCategoryHeaderLabel', () => {
  const headers: Record<string, string> = {
    resolution: 'Resolution',
    performanceImpact: 'Performance Impact',
    'performance-impact': 'Perf Impact Direct',
  };

  it('returns direct lookup when key exists', () => {
    expect(getCategoryHeaderLabel('resolution', headers)).toBe('Resolution');
  });

  it('returns direct lookup for hyphenated key', () => {
    expect(getCategoryHeaderLabel('performance-impact', headers)).toBe('Perf Impact Direct');
  });

  it('returns camelCase lookup for underscore-separated header', () => {
    expect(getCategoryHeaderLabel('performance_impact', headers)).toBe('Performance Impact');
  });

  it('falls back to formatCategoryName when header not found', () => {
    expect(getCategoryHeaderLabel('some-header', {})).toBe('Some Header');
  });
});

// ---------------------------------------------------------------------------
// getLoaderOptions
// ---------------------------------------------------------------------------

describe('getLoaderOptions', () => {
  it('returns SHADER_LOADER_OPTIONS for shader project type', () => {
    expect(getLoaderOptions('shader')).toEqual(SHADER_LOADER_OPTIONS);
  });

  it('returns empty array for resourcepack project type', () => {
    expect(getLoaderOptions('resourcepack')).toEqual([]);
  });

  it('returns LOADER_OPTIONS for mod project type', () => {
    expect(getLoaderOptions('mod')).toEqual(LOADER_OPTIONS);
  });

  it('returns LOADER_OPTIONS for modpack project type', () => {
    expect(getLoaderOptions('modpack')).toEqual(LOADER_OPTIONS);
  });

  it('returns LOADER_OPTIONS for unknown project type', () => {
    expect(getLoaderOptions('unknown')).toEqual(LOADER_OPTIONS);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('MAX_SEARCH_HISTORY is 50', () => {
    expect(MAX_SEARCH_HISTORY).toBe(50);
  });

  it('CONCURRENCY_LIMIT is 15', () => {
    expect(CONCURRENCY_LIMIT).toBe(15);
  });

  it('FALLBACK_ICON is a valid https URL', () => {
    expect(FALLBACK_ICON).toMatch(/^https:\/\//);
  });

  it('LEVEL_COLORS has log, info, warn, error keys', () => {
    expect(LEVEL_COLORS).toHaveProperty('log');
    expect(LEVEL_COLORS).toHaveProperty('info');
    expect(LEVEL_COLORS).toHaveProperty('warn');
    expect(LEVEL_COLORS).toHaveProperty('error');
  });

  it('ENVIRONMENT_OPTIONS contains required, optional, unsupported', () => {
    expect(ENVIRONMENT_OPTIONS).toContain('required');
    expect(ENVIRONMENT_OPTIONS).toContain('optional');
    expect(ENVIRONMENT_OPTIONS).toContain('unsupported');
  });

  it('LOADER_OPTIONS has Fabric, Forge, NeoForge, Quilt', () => {
    const values = LOADER_OPTIONS.map((o) => o.value);
    expect(values).toContain('fabric');
    expect(values).toContain('forge');
    expect(values).toContain('neoforge');
    expect(values).toContain('quilt');
  });

  it('SHADER_LOADER_OPTIONS has iris, optifine, vanilla-shader, canvas', () => {
    const values = SHADER_LOADER_OPTIONS.map((o) => o.value);
    expect(values).toContain('iris');
    expect(values).toContain('optifine');
    expect(values).toContain('vanilla-shader');
    expect(values).toContain('canvas');
  });
});

// ---------------------------------------------------------------------------
// countActiveFilters
// ---------------------------------------------------------------------------

describe('countActiveFilters', () => {
  it('returns 0 for all-null filters', () => {
    expect(countActiveFilters({ loaders: { fabric: null, forge: null } })).toBe(0);
  });

  it('counts non-null loader values', () => {
    expect(
      countActiveFilters({ loaders: { fabric: 'include', forge: null, quilt: 'exclude' } }),
    ).toBe(2);
  });

  it('counts non-null category values', () => {
    expect(
      countActiveFilters({
        loaders: {},
        categories: { optimization: 'include', technology: null },
      }),
    ).toBe(1);
  });

  it('counts non-null environment values', () => {
    expect(
      countActiveFilters({
        loaders: {},
        environment: { client_side: 'include', server_side: null },
      }),
    ).toBe(1);
  });

  it('counts non-null "other" values', () => {
    expect(
      countActiveFilters({
        loaders: {},
        other: { open_source: 'include' },
      }),
    ).toBe(1);
  });

  it('sums counts across all filter groups', () => {
    expect(
      countActiveFilters({
        loaders: { fabric: 'include' },
        categories: { optimization: 'include', technology: 'exclude' },
        environment: { client_side: 'include', server_side: 'include' },
        other: { open_source: null },
      }),
    ).toBe(5);
  });

  it('returns 0 when no optional groups are present', () => {
    expect(countActiveFilters({ loaders: {} })).toBe(0);
  });
});
