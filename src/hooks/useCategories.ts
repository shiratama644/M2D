'use client';

import { useState, useEffect, useMemo } from 'react';
import { API } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { ModCategory } from '../types/modrinth';

// Module-level cache to avoid re-fetching on every component mount.
let cachedCategories: ModCategory[] | null = null;

export interface CategoryGroup {
  header: string;
  items: ModCategory[];
}

// Preferred display order for category header groups (matches Modrinth's display order).
// Headers not in this list are sorted after the listed ones by alphabetical order.
const HEADER_ORDER = ['categories', 'features', 'resolutions', 'performance_impact'];

function headerSortIndex(header: string): number {
  const index = HEADER_ORDER.indexOf(header);
  return index === -1 ? HEADER_ORDER.length : index;
}

// Logical sort order for performance_impact categories (lowest to highest impact).
const PERFORMANCE_IMPACT_ORDER = ['potato', 'low', 'medium', 'high', 'screenshot', 'fancy'];

function performanceImpactSortIndex(name: string): number {
  const index = PERFORMANCE_IMPACT_ORDER.indexOf(name);
  return index === -1 ? PERFORMANCE_IMPACT_ORDER.length : index;
}

// Sort resolution strings (e.g. "16x", "128x") numerically by their leading number.
function resolutionSortKey(name: string): number {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function categoryItemComparator(a: ModCategory, b: ModCategory): number {
  if (a.header === 'performance_impact') {
    return performanceImpactSortIndex(a.name) - performanceImpactSortIndex(b.name);
  }
  if (a.header === 'resolutions') {
    return resolutionSortKey(a.name) - resolutionSortKey(b.name);
  }
  return a.name.localeCompare(b.name);
}

/**
 * Fetches all Modrinth categories and returns those matching the given project type.
 * Results are sorted by predefined header order, then by a per-header sort rule:
 * - `resolutions` items are sorted numerically (e.g. 16x, 32x, 64x…).
 * - `performance_impact` items follow a logical low-to-high order (potato → screenshot → fancy).
 * - All other items are sorted alphabetically by name.
 * Fetched data is cached in module scope.
 */
export function useCategories(projectType: string): ModCategory[] {
  const { addDebugLog } = useApp();
  const [allCategories, setAllCategories] = useState<ModCategory[]>(() => cachedCategories ?? []);

  useEffect(() => {
    if (cachedCategories !== null) return;
    API.getCategories()
      .then((cats) => {
        cachedCategories = cats;
        setAllCategories(cats);
      })
      .catch((e: unknown) => addDebugLog('warn', `Failed to load categories: ${e}`));
  }, [addDebugLog]);

  return useMemo(
    () =>
      allCategories
        .filter((c) => c.project_type === projectType)
        .sort(
          (a, b) =>
            headerSortIndex(a.header) - headerSortIndex(b.header) ||
            categoryItemComparator(a, b),
        ),
    [allCategories, projectType],
  );
}

/**
 * Same as useCategories but returns categories grouped by their `header` field.
 * Order of groups preserves the sorted header order.
 */
export function useCategoryGroups(projectType: string): CategoryGroup[] {
  const categories = useCategories(projectType);
  return useMemo(() => {
    const map = new Map<string, ModCategory[]>();
    for (const cat of categories) {
      const group = map.get(cat.header);
      if (group) {
        group.push(cat);
      } else {
        map.set(cat.header, [cat]);
      }
    }
    return Array.from(map.entries()).map(([header, items]) => ({ header, items }));
  }, [categories]);
}
