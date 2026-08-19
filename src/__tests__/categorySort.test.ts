import { describe, it, expect } from 'vitest';
import {
  categoryItemComparator,
  groupCategories,
  headerSortIndex,
  performanceImpactSortIndex,
  resolutionSortKey,
  sortCategories,
} from '@/lib/categorySort';
import type { ModCategory } from '@/types/modrinth';

function cat(partial: Partial<ModCategory> & Pick<ModCategory, 'name' | 'header'>): ModCategory {
  return {
    icon: '',
    project_type: 'mod',
    ...partial,
  };
}

describe('headerSortIndex', () => {
  it('orders known headers first', () => {
    expect(headerSortIndex('categories')).toBeLessThan(headerSortIndex('features'));
    expect(headerSortIndex('features')).toBeLessThan(headerSortIndex('resolutions'));
    expect(headerSortIndex('resolutions')).toBeLessThan(headerSortIndex('performance_impact'));
  });

  it('puts unknown headers after the known list', () => {
    expect(headerSortIndex('custom')).toBe(4);
  });
});

describe('performanceImpactSortIndex', () => {
  it('orders potato before fancy', () => {
    expect(performanceImpactSortIndex('potato')).toBeLessThan(performanceImpactSortIndex('fancy'));
  });

  it('puts screenshot-utility last among known names', () => {
    expect(performanceImpactSortIndex('screenshot-utility')).toBeGreaterThan(
      performanceImpactSortIndex('fancy'),
    );
  });
});

describe('resolutionSortKey', () => {
  it('parses leading digits', () => {
    expect(resolutionSortKey('16x')).toBe(16);
    expect(resolutionSortKey('128x')).toBe(128);
  });

  it('returns MAX_SAFE_INTEGER when there is no number', () => {
    expect(resolutionSortKey('hd')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('categoryItemComparator', () => {
  it('sorts performance_impact by impact order', () => {
    const high = cat({ name: 'high', header: 'performance_impact' });
    const potato = cat({ name: 'potato', header: 'performance_impact' });
    expect(categoryItemComparator(potato, high)).toBeLessThan(0);
  });

  it('sorts resolutions numerically', () => {
    const a = cat({ name: '128x', header: 'resolutions' });
    const b = cat({ name: '16x', header: 'resolutions' });
    expect(categoryItemComparator(b, a)).toBeLessThan(0);
  });

  it('sorts other headers alphabetically', () => {
    const a = cat({ name: 'utility', header: 'categories' });
    const b = cat({ name: 'adventure', header: 'categories' });
    expect(categoryItemComparator(b, a)).toBeLessThan(0);
  });
});

describe('sortCategories', () => {
  it('filters by project type then sorts by header then name', () => {
    const input = [
      cat({ name: 'utility', header: 'categories', project_type: 'mod' }),
      cat({ name: 'adventure', header: 'categories', project_type: 'mod' }),
      cat({ name: 'pbr', header: 'features', project_type: 'shader' }),
      cat({ name: 'magic', header: 'features', project_type: 'mod' }),
    ];
    expect(sortCategories(input, 'mod').map((c) => c.name)).toEqual([
      'adventure',
      'utility',
      'magic',
    ]);
  });
});

describe('groupCategories', () => {
  it('groups consecutive headers after sort', () => {
    const sorted = [
      cat({ name: 'a', header: 'categories' }),
      cat({ name: 'b', header: 'categories' }),
      cat({ name: 'c', header: 'features' }),
    ];
    const groups = groupCategories(sorted);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ header: 'categories', items: [sorted[0], sorted[1]] });
    expect(groups[1].header).toBe('features');
  });
});
