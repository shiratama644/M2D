import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../utils/helpers';
import CustomSelect from './CustomSelect';

export default function FilterModal({ filters, onApply, onClose, sort }) {
  const { t } = useApp();
  const [pending, setPending] = useState({
    ...filters,
    loaders: { ...filters.loaders },
    categories: { ...(filters.categories || {}) },
    environment: {
      client_side: [...(filters.environment?.client_side || [])],
      server_side: [...(filters.environment?.server_side || [])],
    },
    other: { ...(filters.other || {}) },
  });
  const [pendingSort, setPendingSort] = useState(sort);
  const [snapshot] = useState({
    ...filters,
    loaders: { ...filters.loaders },
    categories: { ...(filters.categories || {}) },
    environment: {
      client_side: [...(filters.environment?.client_side || [])],
      server_side: [...(filters.environment?.server_side || [])],
    },
    other: { ...(filters.other || {}) },
  });
  const [snapshotSort] = useState(sort);

  const sortOptions = [
    { value: 'relevance', label: t.sort.relevance },
    { value: 'downloads', label: t.sort.downloads },
    { value: 'follows',   label: t.sort.followers },
    { value: 'newest',    label: t.sort.publishedDate },
    { value: 'updated',   label: t.sort.updatedDate },
  ];

  const envButtonOptions = [
    { value: 'required', label: t.environment.required },
    { value: 'optional', label: t.environment.optional },
    { value: 'unsupported', label: t.environment.unsupported },
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

  const toggleCategoryState = (category, state) => {
    setPending(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category] === state ? null : state,
      },
    }));
  };

  const toggleEnvironmentValue = (side, value) => {
    setPending(prev => {
      const current = prev.environment[side] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        environment: { ...prev.environment, [side]: updated },
      };
    });
  };

  const toggleOtherState = (key, state) => {
    setPending(prev => ({
      ...prev,
      other: {
        ...prev.other,
        [key]: prev.other[key] === state ? null : state,
      },
    }));
  };

  const handleUndo = () => {
    setPending({
      ...snapshot,
      loaders: { ...snapshot.loaders },
      categories: { ...snapshot.categories },
      environment: {
        client_side: [...(snapshot.environment?.client_side || [])],
        server_side: [...(snapshot.environment?.server_side || [])],
      },
      other: { ...snapshot.other },
    });
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
            <img src="/icons/modrinth.svg" alt="Modrinth" className="modrinth-filter-icon" />
            {t.filters.title}
          </h3>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.version}</h4>
            <input
              type="text"
              value={pending.version}
              onChange={e => setPending(prev => ({ ...prev, version: e.target.value }))}
              placeholder="ex: 1.21.1"
              className="input-large"
            />
          </div>
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
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.categories}</h4>
            <div className="filter-items">
              {CATEGORY_OPTIONS.map(({ value, labelKey }) => {
                const label = t.categories[labelKey];
                return (
                  <div key={value} className="filter-item-row">
                    <span className="filter-item-label">{label}</span>
                    <div className="filter-item-btns">
                      <button
                        className={`btn-filter-state${pending.categories[value] === 'include' ? ' active-include' : ''}`}
                        onClick={() => toggleCategoryState(value, 'include')}
                      >
                        {t.filters.include}
                      </button>
                      <button
                        className={`btn-filter-state${pending.categories[value] === 'exclude' ? ' active-exclude' : ''}`}
                        onClick={() => toggleCategoryState(value, 'exclude')}
                      >
                        {t.filters.exclude}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.environment}</h4>
            <div className="filter-items">
              <div className="filter-env-row">
                <span className="filter-item-label filter-env-label">{t.filters.clientSide}</span>
                <div className="filter-env-btns">
                  {envButtonOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      className={`btn-filter-env${(pending.environment.client_side || []).includes(value) ? ' active-include' : ''}`}
                      onClick={() => toggleEnvironmentValue('client_side', value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-env-row">
                <span className="filter-item-label filter-env-label">{t.filters.serverSide}</span>
                <div className="filter-env-btns">
                  {envButtonOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      className={`btn-filter-env${(pending.environment.server_side || []).includes(value) ? ' active-include' : ''}`}
                      onClick={() => toggleEnvironmentValue('server_side', value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="filter-category" style={{ marginBottom: 0 }}>
            <h4 className="filter-category-title">{t.filters.other}</h4>
            <div className="filter-items">
              {OTHER_FILTER_OPTIONS.map(({ value, labelKey }) => {
                const label = t.filters[labelKey];
                return (
                  <div key={value} className="filter-item-row">
                    <span className="filter-item-label">{label}</span>
                    <div className="filter-item-btns">
                      <button
                        className={`btn-filter-state${pending.other[value] === 'include' ? ' active-include' : ''}`}
                        onClick={() => toggleOtherState(value, 'include')}
                      >
                        {t.filters.include}
                      </button>
                      <button
                        className={`btn-filter-state${pending.other[value] === 'exclude' ? ' active-exclude' : ''}`}
                        onClick={() => toggleOtherState(value, 'exclude')}
                      >
                        {t.filters.exclude}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
