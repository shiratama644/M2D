'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, OTHER_FILTER_OPTIONS, getCategoryLabel, getCategoryHeaderLabel } from '../../lib/helpers';
import { CATEGORY_ICON_MAP } from '../../lib/categoryIcons';
import { useGameVersions } from '../../hooks/useGameVersions';
import { useCategoryGroups } from '../../hooks/useCategories';
import CustomSelect from '../ui/CustomSelect';
import FilterRow from '../ui/FilterRow';
import Icon from '../ui/Icon';
import type { SearchParams } from '../../hooks/useDependencyCheck';
import type { DiscoverType } from '../../store/useAppStore';

import cubeIconRaw from '../../assets/icons/cube.svg';
import packageIconRaw from '../../assets/icons/package.svg';
import imageIconRaw from '../../assets/icons/image.svg';
import sparklesIconRaw from '../../assets/icons/sparkles.svg';

interface LeftPanelProps {
  onFilterChange: (filters: SearchParams['filters']) => void;
}

type Filters = SearchParams['filters'];

function makeInitialFilters(modVersion: string): Filters {
  return {
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>,
    categories: {},
    environment: { client_side: null, server_side: null },
    other: Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>,
    version: modVersion || '',
  };
}

export default function LeftPanel({ onFilterChange }: LeftPanelProps) {
  const { t, modVersion, updateModVersion, discoverType, setDiscoverType } = useApp();
  const gameVersions = useGameVersions();
  const categoryGroups = useCategoryGroups(discoverType);
  const [filters, setFilters] = useState<Filters>(() => makeInitialFilters(modVersion));

  const [prevModVersion, setPrevModVersion] = useState(modVersion);
  if (prevModVersion !== modVersion) {
    setPrevModVersion(modVersion);
    setFilters((prev) => ({ ...prev, version: modVersion || '' }));
  }

  const DISCOVER_OPTIONS: Array<{ type: DiscoverType; label: string; icon: string }> = [
    { type: 'mod', label: t.discover.mod, icon: cubeIconRaw },
    { type: 'modpack', label: t.discover.modpack, icon: packageIconRaw },
    { type: 'resourcepack', label: t.discover.texture, icon: imageIconRaw },
    { type: 'shader', label: t.discover.shader, icon: sparklesIconRaw },
  ];

  const emit = (newFilters: Filters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Keep refs so effects always see the latest values without re-running.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Reset category filters and notify parent when project type changes.
  // Calling onFilterChange inside the setFilters updater would trigger a
  // parent setState during render (React error), so we compute the reset
  // value once and call both updates sequentially in the effect body.
  useEffect(() => {
    const reset = { ...filtersRef.current, categories: {} };
    setFilters(reset);
    onFilterChangeRef.current(reset);
  // Intentionally omit onFilterChange from deps – we use a ref to keep it stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverType]);

  const setVersion = (v: string) => {
    const newFilters = { ...filters, version: v };
    if (v && v !== modVersion) updateModVersion(v);
    emit(newFilters);
  };

  const toggleLoader = (loader: string, state: string) => {
    emit({ ...filters, loaders: { ...filters.loaders, [loader]: filters.loaders[loader] === state ? null : state } });
  };

  const toggleCategory = (cat: string, state: string) => {
    emit({ ...filters, categories: { ...(filters.categories ?? {}), [cat]: (filters.categories ?? {})[cat] === state ? null : state } });
  };

  const toggleEnvironment = (side: 'client_side' | 'server_side', state: string) => {
    emit({
      ...filters,
      environment: {
        ...(filters.environment ?? { client_side: null, server_side: null }),
        [side]: (filters.environment ?? {})[side] === state ? null : state,
      },
    });
  };

  const toggleOther = (key: string, state: string) => {
    emit({ ...filters, other: { ...(filters.other ?? {}), [key]: (filters.other ?? {})[key] === state ? null : state } });
  };

  return (
    <div className="left-panel">
      <div className="lp-discover-section">
        <h4 className="lp-filter-title">{t.discover.title}</h4>
        <div className="lp-discover-btns">
          {DISCOVER_OPTIONS.map(({ type, label, icon }) => (
            <button
              key={type}
              className={`lp-discover-btn${discoverType === type ? ' active' : ''}`}
              onClick={() => setDiscoverType(type)}
            >
              <Icon svg={icon} size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="left-panel-filters">
      <div className="lp-filter-section">
        <h4 className="lp-filter-title">{t.filters.version}</h4>
        <CustomSelect
          options={[
            { value: '', label: t.filters.versionAny },
            ...gameVersions.map((v) => ({ value: v.version, label: v.version })),
          ]}
          value={filters.version ?? ''}
          onChange={setVersion}
        />
      </div>

      <div className="lp-filter-section">
        <h4 className="lp-filter-title">{t.filters.loader}</h4>
        <div className="lp-filter-items">
          {LOADER_OPTIONS.map(({ value, label }) => (
            <FilterRow
              key={value}
              label={label}
              iconSvg={LOADER_ICON_PATHS[value]}
              iconClassName="loader-icon-img"
              state={(filters.loaders[value] ?? null) as string | null}
              onToggle={(s) => toggleLoader(value, s)}
            />
          ))}
        </div>
      </div>

      {categoryGroups.length > 0 && categoryGroups.map(({ header, items }) => (
        <div className="lp-filter-section" key={header}>
          <h4 className="lp-filter-title">{getCategoryHeaderLabel(header, t.filters.categoryHeaders)}</h4>
          <div className="lp-filter-items">
            {items.map(({ name }) => (
              <FilterRow
                key={name}
                label={getCategoryLabel(name, t.categories)}
                iconSvg={CATEGORY_ICON_MAP[name]}
                iconClassName="category-icon-img"
                state={((filters.categories ?? {})[name] ?? null) as string | null}
                onToggle={(s) => toggleCategory(name, s)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="lp-filter-section">
        <h4 className="lp-filter-title">{t.filters.environment}</h4>
        <div className="lp-filter-items">
          {([
            { key: 'client_side' as const, label: t.filters.clientSide },
            { key: 'server_side' as const, label: t.filters.serverSide },
          ]).map(({ key, label }) => (
            <FilterRow
              key={key}
              label={label}
              state={((filters.environment ?? {})[key] ?? null) as string | null}
              onToggle={(s) => toggleEnvironment(key, s)}
            />
          ))}
        </div>
      </div>

      <div className="lp-filter-section">
        <h4 className="lp-filter-title">{t.filters.other}</h4>
        <div className="lp-filter-items">
          {OTHER_FILTER_OPTIONS.map(({ value, labelKey }) => (
            <FilterRow
              key={value}
              label={t.filters[labelKey as keyof typeof t.filters] as string}
              state={((filters.other ?? {})[value] ?? null) as string | null}
              onToggle={(s) => toggleOther(value, s)}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
