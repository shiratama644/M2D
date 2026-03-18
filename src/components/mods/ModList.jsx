'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ModCard from './ModCard';
import { API } from '../../lib/api';
import { useApp } from '../../context/AppContext';

function buildFacets(filters) {
  const facets = [['project_type:mod']];
  if (!filters) return facets;

  const included = Object.entries(filters.loaders || {})
    .filter(([, v]) => v === 'include')
    .map(([k]) => `categories:${k}`);
  const excluded = Object.entries(filters.loaders || {})
    .filter(([, v]) => v === 'exclude');

  if (included.length > 0) facets.push(included);
  excluded.forEach(([k]) => facets.push([`NOT categories:${k}`]));

  const includedCats = Object.entries(filters.categories || {})
    .filter(([, v]) => v === 'include')
    .map(([k]) => `categories:${k}`);
  const excludedCats = Object.entries(filters.categories || {})
    .filter(([, v]) => v === 'exclude');

  if (includedCats.length > 0) facets.push(includedCats);
  excludedCats.forEach(([k]) => facets.push([`NOT categories:${k}`]));

  if (filters.environment) {
    const cs = filters.environment.client_side;
    const ss = filters.environment.server_side;
    if (cs === 'include') facets.push(['client_side:required', 'client_side:optional']);
    else if (cs === 'exclude') facets.push(['client_side:unsupported']);
    if (ss === 'include') facets.push(['server_side:required', 'server_side:optional']);
    else if (ss === 'exclude') facets.push(['server_side:unsupported']);
  }

  if (filters.other?.open_source === 'include') facets.push(['open_source:true']);
  else if (filters.other?.open_source === 'exclude') facets.push(['NOT open_source:true']);

  if (filters.version?.trim()) facets.push([`versions:${filters.version.trim()}`]);

  return facets;
}

const LIMIT = 12;

export default function ModList({ searchParams, isDesktop, initialMods }) {
  const { updateModDataMap, addDebugLog } = useApp();
  const [mods, setMods] = useState(() => initialMods ?? []);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const offsetRef = useRef(initialMods?.length ?? 0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(initialMods != null ? initialMods.length >= LIMIT : true);
  const sentinelRef = useRef(null);

  // Track unconsumed SSR data: null means "no server data, client must fetch".
  const initialDataRef = useRef(initialMods != null ? initialMods : null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    const p = searchParams;
    const offset = offsetRef.current;

    loadingRef.current = true;
    setLoading(true);

    const facets = buildFacets(p.filters);
    let index;
    if (!p.sort || p.sort === 'relevance') {
      index = (p.query || '').trim() === '' ? 'downloads' : 'relevance';
    } else {
      index = p.sort;
    }

    try {
      const data = await API.searchMods(p.query || '', facets, offset, LIMIT, index);
      if (!data.hits || data.hits.length === 0) {
        hasMoreRef.current = false;
        if (offset === 0) {
          setNoResults(true);
          addDebugLog('info', `Search returned no results for "${p.query}"`);
        }
      } else {
        const modMap = {};
        data.hits.forEach((mod) => { modMap[mod.project_id] = mod; });
        updateModDataMap(modMap);
        setNoResults(false);
        setMods((prev) => [...prev, ...data.hits]);
        offsetRef.current = offset + data.hits.length;
        addDebugLog('log', `Loaded ${data.hits.length} mods (offset=${offset}, total≈${data.total_hits ?? '?'})`);
        if (data.hits.length < LIMIT) hasMoreRef.current = false;
      }
    } catch (err) {
      addDebugLog('error', `Search error: ${err}`);
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchParams, updateModDataMap, addDebugLog]);

  // Reset on new search params then trigger first load.
  // On the very first render after SSR, consume the server-provided data
  // instead of re-fetching it from the client.
  useEffect(() => {
    if (initialDataRef.current !== null) {
      // Consume the SSR snapshot: populate modDataMap and update refs.
      const serverMods = initialDataRef.current;
      initialDataRef.current = null;
      const modMap = {};
      serverMods.forEach((mod) => { modMap[mod.project_id] = mod; });
      updateModDataMap(modMap);
      // mods state is already initialised via useState(initialMods ?? []).
      offsetRef.current = serverMods.length;
      hasMoreRef.current = serverMods.length >= LIMIT;
      if (serverMods.length === 0) setNoResults(true);
      return;
    }
    setMods([]);
    setNoResults(false);
    offsetRef.current = 0;
    loadingRef.current = false;
    hasMoreRef.current = true;
    const t = setTimeout(() => loadMore(), 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadMore]);

  // Infinite-scroll sentinel observer
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
    <main className="main-content">
      <div className="mod-list">
        {noResults && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2.5rem' }}>
            No mods found.
          </div>
        )}
        {mods.map((mod) => (
          <ModCard key={mod.project_id} mod={mod} isDesktop={isDesktop} />
        ))}
      </div>
      <div
        ref={sentinelRef}
        className="loader-sentinel"
        style={{ opacity: loading ? 1 : 0 }}
      >
        <div className="loader-dots">
          <div /><div /><div /><div />
        </div>
      </div>
    </main>
  );
}
