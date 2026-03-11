import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';

export default function SearchSection({ onSearch }) {
  const { fastSearch, t } = useApp();
  const [loader, setLoader] = useState('fabric');
  const [version, setVersion] = useState('1.21.1');
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const loaderOptions = [
    { value: '', label: t.loaders.any },
    { value: 'fabric', label: 'Fabric' },
    { value: 'forge', label: 'Forge' },
    { value: 'neoforge', label: 'NeoForge' },
    { value: 'quilt', label: 'Quilt' },
  ];

  const doSearch = (q = query, l = loader, v = version) => {
    onSearch({ query: q, loader: l, version: v });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (fastSearch) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, loader, version), 500);
    }
  };

  const handleVersionInput = (e) => {
    const v = e.target.value;
    setVersion(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, loader, v), 1000);
  };

  const handleLoaderSelect = (value) => {
    setLoader(value);
    doSearch(query, value, version);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <section className="search-section">
      <div className="filter-grid">
        <div className="filter-item">
          <label>{t.search.loader}</label>
          <CustomSelect
            options={loaderOptions}
            value={loader}
            onChange={handleLoaderSelect}
          />
        </div>
        <div className="filter-item">
          <label>{t.search.version}</label>
          <input
            type="text"
            value={version}
            onChange={handleVersionInput}
            onKeyPress={handleKeyPress}
            placeholder="ex: 1.21.1"
            className="input-large"
          />
        </div>
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
    </section>
  );
}
