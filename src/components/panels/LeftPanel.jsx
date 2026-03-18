'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../../lib/helpers';
import { CATEGORY_ICON_MAP } from '../../lib/categoryIcons';
import { useGameVersions } from '../../hooks/useGameVersions';
import CustomSelect from '../ui/CustomSelect';
import FilterRow from '../ui/FilterRow';
import Icon from '../ui/Icon';

import cubeIconRaw from '../../assets/icons/cube.svg';
import packageIconRaw from '../../assets/icons/package.svg';
import blocksIconRaw from '../../assets/icons/blocks.svg';
import bookmarkIconRaw from '../../assets/icons/bookmark.svg';
import clientIconRaw from '../../assets/icons/client.svg';
import serverIconRaw from '../../assets/icons/server.svg';

const NAV_TABS = ['mods', 'resourcePacks', 'shaders'];

const navIcons = {
  mods: cubeIconRaw,
  resourcePacks: packageIconRaw,
  shaders: blocksIconRaw,
};

export default function LeftPanel({ onFilterChange }) {
  const { t, modVersion, updateModVersion } = useApp();
  const gameVersions = useGameVersions();
  const [activeNav, setActiveNav] = useState('mods');
  const [filters, setFilters] = useState(() => ({
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])),
    categories: Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, null])),
    environment: { client_side: null, server_side: null },
    other: Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null])),
    version: modVersion || '',
  }));

  const emit = (newFilters) => onFilterChange(newFilters);

  const setVersion = (v) => {
    const newFilters = { ...filters, version: v };
    setFilters(newFilters);
    if (v && v !== modVersion) updateModVersion(v);
    emit(newFilters);
  };

  const toggleLoader = (loader, state) => {
    const newFilters = {
      ...filters,
      loaders: { ...filters.loaders, [loader]: filters.loaders[loader] === state ? null : state },
    };
    setFilters(newFilters);
    emit(newFilters);
  };

  const toggleCategory = (cat, state) => {
    const newFilters = {
      ...filters,
      categories: { ...filters.categories, [cat]: filters.categories[cat] === state ? null : state },
    };
    setFilters(newFilters);
    emit(newFilters);
  };

  const toggleEnvironment = (side, state) => {
    const newFilters = {
      ...filters,
      environment: { ...filters.environment, [side]: filters.environment[side] === state ? null : state },
    };
    setFilters(newFilters);
    emit(newFilters);
  };

  const toggleOther = (key, state) => {
    const newFilters = {
      ...filters,
      other: { ...filters.other, [key]: filters.other[key] === state ? null : state },
    };
    setFilters(newFilters);
    emit(newFilters);
  };

  return (
    <div className="left-panel">
      {/* Navigation Tabs */}
      <div className="left-panel-nav">
        {NAV_TABS.map((tab) => (
          <button
            key={tab}
            className={`left-nav-btn ${activeNav === tab ? 'active' : ''} ${tab !== 'mods' ? 'disabled' : ''}`}
            onClick={() => tab === 'mods' && setActiveNav(tab)}
            title={tab !== 'mods' ? 'Coming soon' : undefined}
          >
            <Icon svg={navIcons[tab]} size={16} />
            <span>{t.nav[tab]}</span>
          </button>
        ))}
      </div>

      {/* Profiles hint */}
      <div className="left-panel-profiles-hint">
        <Icon svg={bookmarkIconRaw} size={14} />
        <span>{t.nav.profilesHint}</span>
      </div>

      {/* Filters */}
      <div className="left-panel-filters">

        {/* Version */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.version}</h4>
          <CustomSelect
            options={[
              { value: '', label: t.filters.versionAny },
              ...gameVersions.map((v) => ({ value: v.version, label: v.version })),
            ]}
            value={filters.version}
            onChange={setVersion}
          />
        </div>

        {/* Loader */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.loader}</h4>
          <div className="lp-filter-items">
            {LOADER_OPTIONS.map(({ value, label }) => (
              <FilterRow
                key={value}
                label={label}
                iconSvg={LOADER_ICON_PATHS[value]}
                iconClassName="loader-icon-img"
                state={filters.loaders[value]}
                onToggle={(s) => toggleLoader(value, s)}
              />
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.categories}</h4>
          <div className="lp-filter-items">
            {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
              <FilterRow
                key={value}
                label={t.categories[labelKey]}
                iconSvg={CATEGORY_ICON_MAP[value]}
                iconClassName="category-icon-img"
                state={filters.categories[value]}
                onToggle={(s) => toggleCategory(value, s)}
              />
            ))}
          </div>
        </div>

        {/* Environment */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.environment}</h4>
          <div className="lp-filter-items">
            {[
              { key: 'client_side', label: t.filters.clientSide, iconSvg: clientIconRaw },
              { key: 'server_side', label: t.filters.serverSide, iconSvg: serverIconRaw },
            ].map(({ key, label, iconSvg }) => (
              <FilterRow
                key={key}
                label={label}
                iconSvg={iconSvg}
                state={filters.environment[key]}
                onToggle={(s) => toggleEnvironment(key, s)}
              />
            ))}
          </div>
        </div>

        {/* Other */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.other}</h4>
          <div className="lp-filter-items">
            {OTHER_FILTER_OPTIONS.map(({ value, labelKey }) => (
              <FilterRow
                key={value}
                label={t.filters[labelKey]}
                state={filters.other[value]}
                onToggle={(s) => toggleOther(value, s)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
