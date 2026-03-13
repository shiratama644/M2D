import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../utils/helpers';
import { API } from '../utils/api';
import CustomSelect from './CustomSelect';

export default function FilterModal({ filters, onApply, onClose, sort }) {
  const { t, addDebugLog } = useApp();
  const [pending, setPending] = useState({
    ...filters,
    loaders: { ...filters.loaders },
    categories: { ...(filters.categories || {}) },
    environment: {
      client_side: filters.environment?.client_side ?? null,
      server_side: filters.environment?.server_side ?? null,
    },
    other: { ...(filters.other || {}) },
  });
  const [pendingSort, setPendingSort] = useState(sort);
  const [snapshot] = useState({
    ...filters,
    loaders: { ...filters.loaders },
    categories: { ...(filters.categories || {}) },
    environment: {
      client_side: filters.environment?.client_side ?? null,
      server_side: filters.environment?.server_side ?? null,
    },
    other: { ...(filters.other || {}) },
  });
  const [snapshotSort] = useState(sort);
  const [gameVersions, setGameVersions] = useState([]);
  const [categoryIcons, setCategoryIcons] = useState({});

  useEffect(() => {
    API.getGameVersions().then(versions => {
      const releases = versions.filter(v => v.version_type === 'release');
      setGameVersions(releases);
    }).catch(e => addDebugLog('warn', `Failed to load game versions: ${e}`));
    API.getCategories().then(cats => {
      const iconMap = {};
      cats.filter(c => c.project_type === 'mod').forEach(c => {
        iconMap[c.name] = c.icon;
      });
      setCategoryIcons(iconMap);
    }).catch(e => addDebugLog('warn', `Failed to load category icons: ${e}`));
  }, [addDebugLog]);

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

  const toggleCategoryState = (category, state) => {
    setPending(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category] === state ? null : state,
      },
    }));
  };

  const toggleEnvironmentState = (side, state) => {
    setPending(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [side]: prev.environment[side] === state ? null : state,
      },
    }));
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
        client_side: snapshot.environment?.client_side ?? null,
        server_side: snapshot.environment?.server_side ?? null,
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
            <FontAwesomeIcon icon={faSlidersH} className="filter-btn-icon" />
            {t.filters.title}
          </h3>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="filter-category">
            <h4 className="filter-category-title">{t.filters.version}</h4>
            <CustomSelect
              options={[
                { value: '', label: t.filters.versionAny || 'Any' },
                ...gameVersions.map(v => ({ value: v.version, label: v.version })),
              ]}
              value={pending.version || ''}
              onChange={v => setPending(prev => ({ ...prev, version: v }))}
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
                const iconSvg = categoryIcons[value];
                return (
                  <div key={value} className="filter-item-row">
                    <span className="filter-item-label">
                      {iconSvg && (
                        <img
                          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`}
                          alt=""
                          className="category-icon-img"
                        />
                      )}
                      {label}
                    </span>
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
              <div className="filter-item-row">
                <span className="filter-item-label">{t.filters.clientSide}</span>
                <div className="filter-item-btns">
                  <button
                    className={`btn-filter-state${pending.environment.client_side === 'include' ? ' active-include' : ''}`}
                    onClick={() => toggleEnvironmentState('client_side', 'include')}
                  >
                    {t.filters.include}
                  </button>
                  <button
                    className={`btn-filter-state${pending.environment.client_side === 'exclude' ? ' active-exclude' : ''}`}
                    onClick={() => toggleEnvironmentState('client_side', 'exclude')}
                  >
                    {t.filters.exclude}
                  </button>
                </div>
              </div>
              <div className="filter-item-row">
                <span className="filter-item-label">{t.filters.serverSide}</span>
                <div className="filter-item-btns">
                  <button
                    className={`btn-filter-state${pending.environment.server_side === 'include' ? ' active-include' : ''}`}
                    onClick={() => toggleEnvironmentState('server_side', 'include')}
                  >
                    {t.filters.include}
                  </button>
                  <button
                    className={`btn-filter-state${pending.environment.server_side === 'exclude' ? ' active-exclude' : ''}`}
                    onClick={() => toggleEnvironmentState('server_side', 'exclude')}
                  >
                    {t.filters.exclude}
                  </button>
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
