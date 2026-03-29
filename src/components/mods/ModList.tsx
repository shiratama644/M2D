'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ModCard from '@/components/mods/ModCard';
import SkeletonCard from '@/components/mods/SkeletonCard';
import { API } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { buildFacets } from '@/lib/facets';
import type { ModHit } from '@/types/modrinth';
import type { SearchParams } from '@/hooks/useDependencyCheck';

const LIMIT = 12;
/** Number of skeleton cards to show while the initial page loads. */
const SKELETON_COUNT = 6;

interface ModListProps {
  searchParams: SearchParams;
  isDesktop: boolean;
  initialMods: ModHit[] | null;
}

export default function ModList({ searchParams, isDesktop, initialMods }: ModListProps) {
  const { updateModDataMap, addDebugLog, discoverType, t } = useApp();
  const [mods, setMods] = useState<ModHit[]>(() => initialMods ?? []);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True only during the very first load (mods list is empty). */
  const [initialLoading, setInitialLoading] = useState(false);

  const offsetRef = useRef(initialMods?.length ?? 0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(initialMods != null ? initialMods.length >= LIMIT : true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initialDataRef = useRef<ModHit[] | null>(initialMods != null ? initialMods : null);

  // Keep refs up-to-date so loadMore can read the latest values without being
  // listed as a dependency (which would cause spurious effect re-runs when the
  // parent re-renders with structurally-equal but referentially-different props).
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const discoverTypeRef = useRef(discoverType);
  discoverTypeRef.current = discoverType;
  const updateModDataMapRef = useRef(updateModDataMap);
  updateModDataMapRef.current = updateModDataMap;
  const addDebugLogRef = useRef(addDebugLog);
  addDebugLogRef.current = addDebugLog;
  const tRef = useRef(t);
  tRef.current = t;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    const p = searchParamsRef.current;
    const offset = offsetRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadingRef.current = true;
    setLoading(true);
    if (offset === 0) setInitialLoading(true);

    const facets = buildFacets(p.filters, discoverTypeRef.current);
    let index: string;
    if (!p.sort || p.sort === 'relevance') {
      index = (p.query || '').trim() === '' ? 'downloads' : 'relevance';
    } else {
      index = p.sort;
    }

    try {
      const data = await API.searchMods(p.query || '', facets, offset, LIMIT, index, controller.signal);
      setError(null);
      if (!data.hits || data.hits.length === 0) {
        hasMoreRef.current = false;
        if (offset === 0) {
          setNoResults(true);
          addDebugLogRef.current('info', `Search returned no results for "${p.query}"`);
        }
      } else {
        const modMap: Record<string, unknown> = {};
        data.hits.forEach((mod) => { modMap[mod.project_id] = mod; });
        updateModDataMapRef.current(modMap);
        setNoResults(false);
        setMods((prev) => [...prev, ...data.hits]);
        offsetRef.current = offset + data.hits.length;
        addDebugLogRef.current('log', `Loaded ${data.hits.length} mods (offset=${offset}, total≈${data.total_hits ?? '?'})`);
        if (data.hits.length < LIMIT) hasMoreRef.current = false;
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      addDebugLogRef.current('error', `Search error: ${err}`);
      hasMoreRef.current = false;
      setError(tRef.current.modList.fetchError);
    } finally {
      if (!controller.signal.aborted) {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    }
  // All external values are accessed via stable refs; no reactive deps needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setNoResults(false);
    hasMoreRef.current = true;
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (initialDataRef.current !== null) {
      const serverMods = initialDataRef.current;
      initialDataRef.current = null;
      const modMap: Record<string, unknown> = {};
      serverMods.forEach((mod) => { modMap[mod.project_id] = mod; });
      updateModDataMapRef.current(modMap);
      offsetRef.current = serverMods.length;
      hasMoreRef.current = serverMods.length >= LIMIT;
      if (serverMods.length === 0) setNoResults(true);
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMods([]);
    setNoResults(false);
    setError(null);
    offsetRef.current = 0;
    loadingRef.current = false;
    hasMoreRef.current = true;
    const timerId = setTimeout(() => loadMore(), 0);
    return () => clearTimeout(timerId);
  // loadMore is stable (empty useCallback deps); searchParams is the real trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <main className="main-content" aria-busy={loading} aria-label="Mod list">
      <div
        className="mod-list"
        role="list"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {/* Skeleton cards shown on initial load before any results arrive */}
        {initialLoading &&
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}

        {!initialLoading && noResults && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2.5rem' }}>
            No mods found.
          </div>
        )}

        {!initialLoading && error && (
          <div className="mod-list-error" role="alert">
            <p>{error}</p>
            <button className="btn-retry" onClick={handleRetry} type="button">
              {t.modList.retry}
            </button>
          </div>
        )}

        {mods.map((mod) => (
          <ModCard key={mod.project_id} mod={mod} isDesktop={isDesktop} />
        ))}
      </div>
      <div
        ref={sentinelRef}
        className="loader-sentinel"
        aria-hidden="true"
        style={{ opacity: loading && !initialLoading ? 1 : 0 }}
      >
        <div className="loader-dots">
          <div /><div /><div /><div />
        </div>
      </div>
    </main>
  );
}
