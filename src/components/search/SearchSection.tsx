'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import CustomSelect from '@/components/ui/CustomSelect';
import Icon from '@/components/ui/Icon';
import FilterModal from '@/components/modals/FilterModal';
import { LOADER_OPTIONS, OTHER_FILTER_OPTIONS, getLoaderOptions } from '@/lib/helpers';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import type { SearchParams } from '@/hooks/useDependencyCheck';
import type { DiscoverType } from '@/store/useAppStore';

import searchIconRaw from '@/assets/icons/search.svg';
import filterIconRaw from '@/assets/icons/filter.svg';

const INITIAL_LOADER_STATE = Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>;
const INITIAL_ENVIRONMENT_STATE = { client_side: null as string | null, server_side: null as string | null };
const INITIAL_OTHER_STATE = Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>;

function makeInitialFilters(modVersion: string): SearchParams['filters'] {
  return {
    loaders: INITIAL_LOADER_STATE,
    categories: {},
    environment: INITIAL_ENVIRONMENT_STATE,
    other: INITIAL_OTHER_STATE,
    version: modVersion || '',
  };
}

function hasActiveFilters(filters: SearchParams['filters']): boolean {
  if (!filters) return false;
  return (
    Object.values(filters.loaders || {}).some(Boolean) ||
    Object.values(filters.categories || {}).some(Boolean) ||
    Object.values(filters.environment || {}).some(Boolean) ||
    Object.values(filters.other || {}).some(Boolean)
  );
}

interface SearchSectionProps {
  onSearch: (params: SearchParams) => void;
}

export default function SearchSection({ onSearch }: SearchSectionProps) {
  const { fastSearch, t, modVersion, discoverType, setDiscoverType } = useApp();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState<SearchParams['filters']>(() => makeInitialFilters(modVersion));
  const [filterOpen, setFilterOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevModVersion, setPrevModVersion] = useState(modVersion);
  if (prevModVersion !== modVersion) {
    setPrevModVersion(modVersion);
    setFilters((prev) => ({ ...prev, version: modVersion || '' }));
  }

  // Reset category AND loader filters when project type changes
  const [prevDiscoverType, setPrevDiscoverType] = useState(discoverType);
  if (prevDiscoverType !== discoverType) {
    setPrevDiscoverType(discoverType);
    const newLoaders = Object.fromEntries(getLoaderOptions(discoverType).map((o) => [o.value, null])) as Record<string, string | null>;
    setFilters((prev) => ({ ...prev, categories: {}, loaders: newLoaders }));
  }

  const makeResetFilters = (type: DiscoverType, base: SearchParams['filters']): SearchParams['filters'] => {
    const newLoaders = Object.fromEntries(getLoaderOptions(type).map((o) => [o.value, null])) as Record<string, string | null>;
    return { ...base, categories: {}, loaders: newLoaders };
  };

  const handleDiscoverTypeChange = (type: DiscoverType) => {
    setDiscoverType(type);
    const newFilters = makeResetFilters(type, filters);
    setFilters(newFilters);
    doSearch(query, sort, newFilters);
  };

  const sortOptions = [
    { value: 'relevance', label: t.sort.relevance },
    { value: 'downloads', label: t.sort.downloads },
    { value: 'follows',   label: t.sort.followers },
    { value: 'newest',    label: t.sort.publishedDate },
    { value: 'updated',   label: t.sort.updatedDate },
  ];

  const doSearch = (q = query, s = sort, f = filters) => onSearch({ query: q, sort: s, filters: f });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (fastSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, sort, filters), 500);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    doSearch(query, newSort, filters);
  };

  const handleFiltersChange = (newFilters: SearchParams['filters']) => {
    setFilters(newFilters);
    doSearch(query, sort, newFilters);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const filtersActive = hasActiveFilters(filters);

  return (
    <section className="search-section">
      {isDesktop ? (
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
          projectType={discoverType}
          onProjectTypeChange={handleDiscoverTypeChange}
        />
      )}
    </section>
  );
}
