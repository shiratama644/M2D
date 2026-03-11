import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LOADER_OPTIONS } from '../utils/helpers';

export default function FilterModal({ filters, onApply, onClose }) {
  const { t } = useApp();
  const [pending, setPending] = useState({
    ...filters,
    loaders: { ...filters.loaders },
  });
  const [snapshot] = useState({
    ...filters,
    loaders: { ...filters.loaders },
  });

  const toggleLoaderState = (loader, state) => {
    setPending(prev => ({
      ...prev,
      loaders: {
        ...prev.loaders,
        [loader]: prev.loaders[loader] === state ? null : state,
      },
    }));
  };

  const handleUndo = () => {
    setPending({ ...snapshot, loaders: { ...snapshot.loaders } });
  };

  const handleApply = () => {
    onApply(pending);
  };

  const handleDone = () => {
    onApply(pending);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">
            <SlidersHorizontal size={20} /> {t.filters.title}
          </h3>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.loader}</h4>
            <div className="filter-items">
              {LOADER_OPTIONS.map(({ value, label }) => (
                <div key={value} className="filter-item-row">
                  <span className="filter-item-label">{label}</span>
                  <div className="filter-item-btns">
                    <button
                      className={`btn-filter-state${pending.loaders[value] === 'include' ? ' active-include' : ''}`}
                      onClick={() => toggleLoaderState(value, 'include')}
                    >
                      {t.filters.include}
                    </button>
                    <button
                      className={`btn-filter-state${pending.loaders[value] === 'exclude' ? ' active-exclude' : ''}`}
                      onClick={() => toggleLoaderState(value, 'exclude')}
                    >
                      {t.filters.exclude}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="filter-category" style={{ marginBottom: 0 }}>
            <h4 className="filter-category-title">{t.filters.version}</h4>
            <input
              type="text"
              value={pending.version}
              onChange={e => setPending(prev => ({ ...prev, version: e.target.value }))}
              placeholder="ex: 1.21.1"
              className="input-large"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleUndo} className="btn-secondary">{t.filters.undo}</button>
          <button onClick={handleApply} className="btn-secondary">{t.filters.apply}</button>
          <button onClick={handleDone} className="btn-primary" style={{ height: '2.25rem', padding: '0 1rem' }}>{t.filters.done}</button>
        </div>
      </div>
    </div>
  );
}
