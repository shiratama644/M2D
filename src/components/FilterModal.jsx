import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS } from '../utils/helpers';
import CustomSelect from './CustomSelect';

export default function FilterModal({ filters, onApply, onClose, sort }) {
  const { t } = useApp();
  const [pending, setPending] = useState({
    ...filters,
    loaders: { ...filters.loaders },
  });
  const [pendingSort, setPendingSort] = useState(sort);
  const [snapshot] = useState({
    ...filters,
    loaders: { ...filters.loaders },
  });
  const [snapshotSort] = useState(sort);

  const sortOptions = [
    { value: 'relevance', label: t.sort.relevance },
    { value: 'downloads', label: t.sort.downloads },
    { value: 'follows',   label: t.sort.followers },
    { value: 'newest',    label: t.sort.publishedDate },
    { value: 'updated',   label: t.sort.updatedDate },
  ];

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
    setPendingSort(snapshotSort);
  };

  const handleApply = () => {
    onApply(pending, pendingSort);
  };

  const handleDone = () => {
    onApply(pending, pendingSort);
    onClose();
  };

  return createPortal(
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
            <h4 className="filter-category-title">{t.sort.label}</h4>
            <CustomSelect
              options={sortOptions}
              value={pendingSort}
              onChange={setPendingSort}
            />
          </div>
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.loader}</h4>
            <div className="filter-items">
              {LOADER_OPTIONS.map(({ value, label }) => {
                const iconSrc = LOADER_ICON_PATHS[value];
                return (
                  <div key={value} className="filter-item-row">
                    <span className="filter-item-label">
                      {iconSrc && (
                        <img src={iconSrc} alt={label} className="loader-icon-img" />
                      )}
                      {label}
                    </span>
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
                );
              })}
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
    </div>,
    document.body
  );
}
