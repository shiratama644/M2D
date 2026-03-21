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

/**
 * Fetches all Modrinth categories and returns those matching the given project type.
 * Results are sorted by predefined header order, then alphabetically by name within
 * each header. Fetched data is cached in module scope.
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
            a.name.localeCompare(b.name),
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
