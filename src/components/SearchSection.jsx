import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';
import Icon from './Icon';
import { LOADER_OPTIONS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../utils/helpers';

import searchIconRaw from '../assets/icons/search.svg?raw';

const INITIAL_LOADER_STATE = Object.fromEntries(LOADER_OPTIONS.map(o => [o.value, null]));
const INITIAL_CATEGORY_STATE = Object.fromEntries(CATEGORY_OPTIONS.map(o => [o.value, null]));
const INITIAL_ENVIRONMENT_STATE = { client_side: null, server_side: null };
const INITIAL_OTHER_STATE = Object.fromEntries(OTHER_FILTER_OPTIONS.map(o => [o.value, null]));

export default function SearchSection({ onSearch }) {
  const { fastSearch, t, modVersion } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const filters = useMemo(() => ({
    loaders: INITIAL_LOADER_STATE,
    categories: INITIAL_CATEGORY_STATE,
    environment: INITIAL_ENVIRONMENT_STATE,
    other: INITIAL_OTHER_STATE,
    version: modVersion || '',
  }), [modVersion]);
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

  const handleSortChange = (newSort) => {
    setSort(newSort);
    doSearch(query, newSort, filters);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <section className="search-section">
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
    </section>
  );
}
