'use client';

import { useState, useEffect, useMemo } from 'react';
import { API } from '../lib/api';
import { useApp } from '../context/AppContext';
import type { ModCategory } from '../types/modrinth';

// Module-level cache to avoid re-fetching on every component mount.
let cachedCategories: ModCategory[] | null = null;

/**
 * Fetches all Modrinth categories and returns those matching the given project type.
 * Results are sorted by header then name. Fetched data is cached in module scope.
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
        .sort((a, b) => a.header.localeCompare(b.header) || a.name.localeCompare(b.name)),
    [allCategories, projectType],
  );
}
