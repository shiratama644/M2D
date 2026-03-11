import { useEffect, useRef, useState, useCallback } from 'react';
import ModCard from './ModCard';
import { API } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function ModList({ searchParams }) {
  const { updateModDataMap } = useApp();
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef(null);
  const LIMIT = 12;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    const p = searchParams;
    const offset = offsetRef.current;

    loadingRef.current = true;
    setLoading(true);

    const facets = [['project_type:mod']];
    if (p.loader) facets.push([`categories:${p.loader}`]);
    if (p.version) facets.push([`versions:${p.version}`]);
    const index = (p.query || '').trim() === '' ? 'downloads' : 'relevance';

    try {
      const data = await API.searchMods(p.query || '', facets, offset, LIMIT, index);
      if (!data.hits || data.hits.length === 0) {
        hasMoreRef.current = false;
        if (offset === 0) setNoResults(true);
      } else {
        const modMap = {};
        data.hits.forEach(mod => { modMap[mod.project_id] = mod; });
        updateModDataMap(modMap);
        setMods(prev => [...prev, ...data.hits]);
        offsetRef.current = offset + data.hits.length;
        if (data.hits.length < LIMIT) {
          hasMoreRef.current = false;
        }
      }
    } catch (err) {
      console.error('Search error', err);
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchParams, updateModDataMap]);

  // Reset on new search params
  useEffect(() => {
    setMods([]);
    setNoResults(false);
    offsetRef.current = 0;
    loadingRef.current = false;
    hasMoreRef.current = true;
    // Trigger initial load after reset
    setTimeout(() => loadMore(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
        loadMore();
      }
    }, { rootMargin: '200px' });

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
        {mods.map(mod => (
          <ModCard key={mod.project_id} mod={mod} />
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
