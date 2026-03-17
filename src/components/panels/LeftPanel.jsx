'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../../lib/helpers';
import { API } from '../../lib/api';
import CustomSelect from '../ui/CustomSelect';
import Icon from '../ui/Icon';

import cubeIconRaw from '../../assets/icons/cube.svg';
import packageIconRaw from '../../assets/icons/package.svg';
import blocksIconRaw from '../../assets/icons/blocks.svg';
import bookmarkIconRaw from '../../assets/icons/bookmark.svg';
import checkIconRaw from '../../assets/icons/check.svg';
import banIconRaw from '../../assets/icons/ban.svg';
import clientIconRaw from '../../assets/icons/client.svg';
import serverIconRaw from '../../assets/icons/server.svg';

import optimizationIconRaw from '../../assets/icons/tags/categories/optimization.svg';
import technologyIconRaw from '../../assets/icons/tags/categories/technology.svg';
import magicIconRaw from '../../assets/icons/tags/categories/magic.svg';
import adventureIconRaw from '../../assets/icons/tags/categories/adventure.svg';
import decorationIconRaw from '../../assets/icons/tags/categories/decoration.svg';
import equipmentIconRaw from '../../assets/icons/tags/categories/equipment.svg';
import mobsIconRaw from '../../assets/icons/tags/categories/mobs.svg';
import libraryIconRaw from '../../assets/icons/tags/categories/library.svg';
import utilityIconRaw from '../../assets/icons/tags/categories/utility.svg';
import worldgenIconRaw from '../../assets/icons/tags/categories/worldgen.svg';
import foodIconRaw from '../../assets/icons/tags/categories/food.svg';
import storageIconRaw from '../../assets/icons/tags/categories/storage.svg';
import gameMechanicsIconRaw from '../../assets/icons/tags/categories/game-mechanics.svg';

const CATEGORY_ICON_MAP = {
  optimization: optimizationIconRaw,
  technology: technologyIconRaw,
  magic: magicIconRaw,
  adventure: adventureIconRaw,
  decoration: decorationIconRaw,
  equipment: equipmentIconRaw,
  mobs: mobsIconRaw,
  library: libraryIconRaw,
  utility: utilityIconRaw,
  worldgen: worldgenIconRaw,
  food: foodIconRaw,
  storage: storageIconRaw,
  'game-mechanics': gameMechanicsIconRaw,
};

const NAV_TABS = ['mods', 'resourcePacks', 'shaders'];

export default function LeftPanel({ onFilterChange }) {
  const { t, modVersion, updateModVersion, addDebugLog } = useApp();
  const [activeNav, setActiveNav] = useState('mods');
  const [gameVersions, setGameVersions] = useState([]);
  const [filters, setFilters] = useState(() => ({
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])),
    categories: Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, null])),
    environment: { client_side: null, server_side: null },
    other: Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null])),
    version: modVersion || '',
  }));

  useEffect(() => {
    API.getGameVersions()
      .then((versions) => {
        const releases = versions.filter((v) => v.version_type === 'release');
        setGameVersions(releases);
      })
      .catch((e) => addDebugLog('warn', `Failed to load game versions: ${e}`));
  }, [addDebugLog]);

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

  const navIcons = {
    mods: cubeIconRaw,
    resourcePacks: packageIconRaw,
    shaders: blocksIconRaw,
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
            {LOADER_OPTIONS.map(({ value, label }) => {
              const iconSvg = LOADER_ICON_PATHS[value];
              return (
                <div key={value} className="lp-filter-row">
                  <span className="lp-filter-label">
                    {iconSvg && <Icon svg={iconSvg} size={14} className="loader-icon-img" />}
                    {label}
                  </span>
                  <div className="lp-filter-btns">
                    <button
                      className={`btn-filter-state${filters.loaders[value] === 'include' ? ' active-include' : ''}`}
                      title={t.filters.include}
                      onClick={() => toggleLoader(value, 'include')}
                    ><Icon svg={checkIconRaw} size={14} /></button>
                    <button
                      className={`btn-filter-state${filters.loaders[value] === 'exclude' ? ' active-exclude' : ''}`}
                      title={t.filters.exclude}
                      onClick={() => toggleLoader(value, 'exclude')}
                    ><Icon svg={banIconRaw} size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.categories}</h4>
          <div className="lp-filter-items">
            {CATEGORY_OPTIONS.map(({ value, labelKey }) => {
              const label = t.categories[labelKey];
              const iconSvg = CATEGORY_ICON_MAP[value];
              return (
                <div key={value} className="lp-filter-row">
                  <span className="lp-filter-label">
                    {iconSvg && <Icon svg={iconSvg} size={14} className="category-icon-img" />}
                    {label}
                  </span>
                  <div className="lp-filter-btns">
                    <button
                      className={`btn-filter-state${filters.categories[value] === 'include' ? ' active-include' : ''}`}
                      title={t.filters.include}
                      onClick={() => toggleCategory(value, 'include')}
                    ><Icon svg={checkIconRaw} size={14} /></button>
                    <button
                      className={`btn-filter-state${filters.categories[value] === 'exclude' ? ' active-exclude' : ''}`}
                      title={t.filters.exclude}
                      onClick={() => toggleCategory(value, 'exclude')}
                    ><Icon svg={banIconRaw} size={14} /></button>
                  </div>
                </div>
              );
            })}
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
              <div key={key} className="lp-filter-row">
                <span className="lp-filter-label">
                  <Icon svg={iconSvg} size={14} />
                  {label}
                </span>
                <div className="lp-filter-btns">
                  <button
                    className={`btn-filter-state${filters.environment[key] === 'include' ? ' active-include' : ''}`}
                    title={t.filters.include}
                    onClick={() => toggleEnvironment(key, 'include')}
                  ><Icon svg={checkIconRaw} size={14} /></button>
                  <button
                    className={`btn-filter-state${filters.environment[key] === 'exclude' ? ' active-exclude' : ''}`}
                    title={t.filters.exclude}
                    onClick={() => toggleEnvironment(key, 'exclude')}
                  ><Icon svg={banIconRaw} size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other */}
        <div className="lp-filter-section">
          <h4 className="lp-filter-title">{t.filters.other}</h4>
          <div className="lp-filter-items">
            {OTHER_FILTER_OPTIONS.map(({ value, labelKey }) => {
              const label = t.filters[labelKey];
              return (
                <div key={value} className="lp-filter-row">
                  <span className="lp-filter-label">{label}</span>
                  <div className="lp-filter-btns">
                    <button
                      className={`btn-filter-state${filters.other[value] === 'include' ? ' active-include' : ''}`}
                      title={t.filters.include}
                      onClick={() => toggleOther(value, 'include')}
                    ><Icon svg={checkIconRaw} size={14} /></button>
                    <button
                      className={`btn-filter-state${filters.other[value] === 'exclude' ? ' active-exclude' : ''}`}
                      title={t.filters.exclude}
                      onClick={() => toggleOther(value, 'exclude')}
                    ><Icon svg={banIconRaw} size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
