'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import CustomSelect from '../ui/CustomSelect';
import Icon from '../ui/Icon';
import FilterModal from '../modals/FilterModal';
import { LOADER_OPTIONS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../../lib/helpers';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import searchIconRaw from '../../assets/icons/search.svg';
import filterIconRaw from '../../assets/icons/filter.svg';

const INITIAL_LOADER_STATE = Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null]));
const INITIAL_CATEGORY_STATE = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, null]));
const INITIAL_ENVIRONMENT_STATE = { client_side: null, server_side: null };
const INITIAL_OTHER_STATE = Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null]));

function makeInitialFilters(modVersion) {
  return {
    loaders: INITIAL_LOADER_STATE,
    categories: INITIAL_CATEGORY_STATE,
    environment: INITIAL_ENVIRONMENT_STATE,
    other: INITIAL_OTHER_STATE,
    version: modVersion || '',
  };
}

function hasActiveFilters(filters) {
  if (!filters) return false;
  return (
    Object.values(filters.loaders || {}).some(Boolean) ||
    Object.values(filters.categories || {}).some(Boolean) ||
    Object.values(filters.environment || {}).some(Boolean) ||
    Object.values(filters.other || {}).some(Boolean)
  );
}

export default function SearchSection({ onSearch }) {
  const { fastSearch, t, modVersion } = useApp();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState(() => makeInitialFilters(modVersion));
  const [filterOpen, setFilterOpen] = useState(false);
  const debounceRef = useRef(null);

  // Keep filter version in sync when modVersion changes (derived state, during render)
  const [prevModVersion, setPrevModVersion] = useState(modVersion);
  if (prevModVersion !== modVersion) {
    setPrevModVersion(modVersion);
    setFilters((prev) => ({ ...prev, version: modVersion || '' }));
  }

  const sortOptions = [
    { value: 'relevance', label: t.sort.relevance },
    { value: 'downloads', label: t.sort.downloads },
    { value: 'follows',   label: t.sort.followers },
    { value: 'newest',    label: t.sort.publishedDate },
    { value: 'updated',   label: t.sort.updatedDate },
  ];

  const doSearch = (q = query, s = sort, f = filters) => onSearch({ query: q, sort: s, filters: f });

  const handleKeyDown = (e) => { if (e.key === 'Enter') doSearch(); };

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (fastSearch) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, sort, filters), 500);
    }
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    doSearch(query, newSort, filters);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    doSearch(query, sort, newFilters);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const filtersActive = hasActiveFilters(filters);

  return (
    <section className="search-section">
      {isDesktop ? (
        /* ── PC: single row – sort (fixed width) + search + button ── */
        <div className="search-bar">
          <div className="sort-control">
            <CustomSelect
              className="sort-select"
              options={sortOptions}
              value={sort}
              onChange={handleSortChange}
            />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={!fastSearch ? handleKeyDown : undefined}
            placeholder={t.search.placeholder}
            className="input-large search-input"
          />
          {!fastSearch && (
            <button onClick={() => doSearch()} className="btn-search">
              <Icon svg={searchIconRaw} size={20} />
            </button>
          )}
        </div>
      ) : (
        /* ── Mobile: two rows – top: sort + filter btn, bottom: search + button ── */
        <>
          <div className="search-bar-top">
            <div className="sort-control">
              <CustomSelect
                className="sort-select"
                options={sortOptions}
                value={sort}
                onChange={handleSortChange}
              />
            </div>
            <button
              className="btn-filters"
              onClick={() => setFilterOpen(true)}
              aria-label={t.filters.title}
            >
              <Icon svg={filterIconRaw} size={16} />
              {t.filters.title}
              {filtersActive && <span className="filter-active-dot" />}
            </button>
          </div>
          <div className="search-bar-bottom">
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={!fastSearch ? handleKeyDown : undefined}
              placeholder={t.search.placeholder}
              className="input-large search-input"
            />
            {!fastSearch && (
              <button onClick={() => doSearch()} className="btn-search">
                <Icon svg={searchIconRaw} size={20} />
              </button>
            )}
          </div>
        </>
      )}

      {filterOpen && (
        <FilterModal
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </section>
  );
}

