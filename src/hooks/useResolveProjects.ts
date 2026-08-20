'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getEngine } from '@/engine/Engine';
import { lookupMod } from '@/lib/modDisplay';

export function useResolveProjects(ids: Iterable<string>): { loading: boolean } {
  const { modDataMap } = useApp();
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
    getEngine()
      .dispatch('catalog.projects', { ids: missing })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { loading };
}
