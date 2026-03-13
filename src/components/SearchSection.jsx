import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import FilterModal from './FilterModal';
import Icon from './Icon';
import { LOADER_OPTIONS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../utils/helpers';

import searchIconRaw from '../assets/icons/search.svg?raw';
import listFilterIconRaw from '../assets/icons/list-filter.svg?raw';

const INITIAL_LOADER_STATE = Object.fromEntries(LOADER_OPTIONS.map(o => [o.value, null]));
const INITIAL_CATEGORY_STATE = Object.fromEntries(CATEGORY_OPTIONS.map(o => [o.value, null]));
const INITIAL_ENVIRONMENT_STATE = { client_side: null, server_side: null };
const INITIAL_OTHER_STATE = Object.fromEntries(OTHER_FILTER_OPTIONS.map(o => [o.value, null]));

function hasActiveFilters(filters, sort) {
  const hasLoader = Object.values(filters.loaders).some(v => v !== null);
  const hasCategory = Object.values(filters.categories || {}).some(v => v !== null);
  const hasEnv = Object.values(filters.environment || {}).some(v => v !== null);
  const hasOther = Object.values(filters.other || {}).some(v => v !== null);
  return hasLoader || hasCategory || hasEnv || hasOther || filters.version.trim() !== '' || sort !== 'relevance';
}

export default function SearchSection({ onSearch }) {
  const { fastSearch, t, filterModalOpen, setFilterModalOpen, modVersion, updateModVersion } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState(() => ({
    loaders: INITIAL_LOADER_STATE,
    categories: INITIAL_CATEGORY_STATE,
    environment: INITIAL_ENVIRONMENT_STATE,
    other: INITIAL_OTHER_STATE,
    version: modVersion || '',
  }));
  const debounceRef = useRef(null);

  const doSearch = (q = query, s = sort, f = filters) => {
    onSearch({ query: q, sort: s, filters: f });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (fastSearch) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, sort, filters), 500);
    }
  };

  const handleApplyFilters = (newFilters, newSort) => {
    setFilters(newFilters);
    if (newSort !== undefined) setSort(newSort);
    if (newFilters.version && newFilters.version !== modVersion) {
      updateModVersion(newFilters.version);
    }
    doSearch(query, newSort ?? sort, newFilters);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <section className="search-section">
      <div className="search-bar">
        <button
          className="btn-filters"
          onClick={() => setFilterModalOpen(true)}
        >
          <Icon svg={listFilterIconRaw} size={16} className="filter-btn-icon" />
          {t.filters.label}
          {hasActiveFilters(filters, sort) && <span className="filter-active-dot" />}
        </button>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyPress={!fastSearch ? handleKeyPress : undefined}
          placeholder={t.search.placeholder}
          className="input-large search-input"
        />
        {!fastSearch && (
          <button onClick={() => doSearch()} className="btn-search">
            <Icon svg={searchIconRaw} size={20} />
          </button>
        )}
      </div>
      {filterModalOpen && (
        <FilterModal
          filters={filters}
          sort={sort}
          onApply={handleApplyFilters}
          onClose={() => setFilterModalOpen(false)}
        />
      )}
    </section>
  );
}
