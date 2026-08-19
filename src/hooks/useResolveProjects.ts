'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { API } from '@/lib/api';
import { indexProjects, lookupMod } from '@/lib/modDisplay';

/**
 * Fetches Modrinth project metadata for any ids that are missing a title
 * in `modDataMap` (e.g. profile loads that only stored opaque ids).
 */
export function useResolveProjects(ids: Iterable<string>): { loading: boolean } {
  const { modDataMap, updateModDataMap } = useApp();
  const [loading, setLoading] = useState(false);
  const key = useMemo(() => Array.from(ids).sort().join(','), [ids]);

  useEffect(() => {
    const list = key ? key.split(',') : [];
    const missing = list.filter((id) => !lookupMod(modDataMap, id)?.title);
    if (missing.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    API.getProjects(missing)
      .then((data) => {
        if (cancelled) return;
        updateModDataMap(indexProjects(data));
      })
      .catch(() => {
        /* titles stay as the unknown-mod placeholder */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // lookup against the latest map; key captures which ids we need
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { loading };
}
