import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';
import FilterModal from './FilterModal';
import { LOADER_OPTIONS } from '../utils/helpers';

const INITIAL_LOADER_STATE = Object.fromEntries(LOADER_OPTIONS.map(o => [o.value, null]));
const INITIAL_FILTERS = { loaders: INITIAL_LOADER_STATE, version: '' };

function hasActiveFilters(filters) {
  const hasLoader = Object.values(filters.loaders).some(v => v !== null);
  return hasLoader || filters.version.trim() !== '';
}

export default function SearchSection({ onSearch }) {
  const { fastSearch, t, filterModalOpen, setFilterModalOpen } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const debounceRef = useRef(null);

  const sortOptions = [
    { value: 'relevance', label: t.sort.relevance },
    { value: 'downloads', label: t.sort.downloads },
    { value: 'follows', label: t.sort.followers },
    { value: 'newest', label: t.sort.publishedDate },
    { value: 'updated', label: t.sort.updatedDate },
  ];

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

  const handleSortChange = (value) => {
    setSort(value);
    doSearch(query, value, filters);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    doSearch(query, sort, newFilters);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <section className="search-section">
      <div className="search-controls-bar">
        <div className="sort-control">
          <label className="control-label">{t.sort.label}</label>
          <CustomSelect
            className="sort-select"
            options={sortOptions}
            value={sort}
            onChange={handleSortChange}
          />
        </div>
        <button
          className="btn-filters"
          onClick={() => setFilterModalOpen(true)}
        >
          <SlidersHorizontal size={16} />
          {t.filters.label}
          {hasActiveFilters(filters) && <span className="filter-active-dot" />}
        </button>
      </div>
      <div className="search-bar">
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
            <Search size={20} />
          </button>
        )}
      </div>
      {filterModalOpen && (
        <FilterModal
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setFilterModalOpen(false)}
        />
      )}
    </section>
  );
}
