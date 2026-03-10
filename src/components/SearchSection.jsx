import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const LOADER_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
];

export default function SearchSection({ onSearch }) {
  const [loader, setLoader] = useState('fabric');
  const [version, setVersion] = useState('1.21.1');
  const [query, setQuery] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const selectedLabel = LOADER_OPTIONS.find(o => o.value === loader)?.label || 'Any';

  const doSearch = (q = query, l = loader, v = version) => {
    onSearch({ query: q, loader: l, version: v });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  const handleVersionInput = (e) => {
    const v = e.target.value;
    setVersion(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, loader, v), 1000);
  };

  const handleLoaderSelect = (value) => {
    setLoader(value);
    setSelectOpen(false);
    doSearch(query, value, version);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSelectOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <section className="search-section">
      <div className="filter-grid">
        <div className="filter-item">
          <label>Loader</label>
          <div ref={wrapperRef} className={`custom-select-wrapper ${selectOpen ? 'open' : ''}`}>
            <div className="custom-select-display input-large" onClick={() => setSelectOpen(o => !o)}>
              <span>{selectedLabel}</span>
              <ChevronDown size={16} className="chevron" />
            </div>
            {selectOpen && (
              <div className="custom-select-options">
                {LOADER_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    className={`custom-select-option ${opt.value === loader ? 'selected' : ''}`}
                    onClick={() => handleLoaderSelect(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="filter-item">
          <label>Version</label>
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
          onChange={e => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search mods..."
          className="input-large search-input"
        />
        <button onClick={() => doSearch()} className="btn-search">
          <Search size={20} />
        </button>
      </div>
    </section>
  );
}
