'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { API } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { ModCategory } from '@/types/modrinth';
import { groupCategories, sortCategories } from '@/lib/categorySort';

// Module-level cache to avoid re-fetching on every component mount.
let cachedCategories: ModCategory[] | null = null;

export function __resetCategoryCache() {
  cachedCategories = null;
}

export interface CategoryGroup {
  header: string;
  items: ModCategory[];
}

/**
 * Fetches all Modrinth categories and returns those matching the given project type.
 * Results are sorted by predefined header order, then by a per-header sort rule:
 * - `resolutions` items are sorted numerically (e.g. 16x, 32x, 64x…).
 * - `performance_impact` items follow a logical low-to-high order (potato → fancy), with screenshot-utility last.
 * - All other items are sorted alphabetically by name.
 * Fetched data is cached in module scope.
 */
export function useCategories(projectType: string): ModCategory[] {
  const { addDebugLog } = useApp();
  const addDebugLogRef = useRef(addDebugLog);
  addDebugLogRef.current = addDebugLog;
  const [allCategories, setAllCategories] = useState<ModCategory[]>(() => cachedCategories ?? []);

  useEffect(() => {
    if (cachedCategories !== null) return;
    const controller = new AbortController();
    API.getCategories(controller.signal)
      .then((cats) => {
        if (!controller.signal.aborted) {
          cachedCategories = cats;
          setAllCategories(cats);
        }
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name !== 'AbortError') {
          addDebugLogRef.current('warn', `Failed to load categories: ${e}`);
        }
      });
    return () => controller.abort();
  // Run once on mount; addDebugLog is accessed via ref to avoid spurious refetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => sortCategories(allCategories, projectType),
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
