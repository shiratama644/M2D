'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { getLoaderOptions, LOADER_ICON_PATHS, OTHER_FILTER_OPTIONS, getCategoryLabel, getCategoryHeaderLabel } from '@/lib/helpers';
import { CATEGORY_ICON_MAP } from '@/lib/categoryIcons';
import { useGameVersions } from '@/hooks/useGameVersions';
import { useCategoryGroups } from '@/hooks/useCategories';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterRow from '@/components/ui/FilterRow';
import Icon from '@/components/ui/Icon';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { getDiscoverOptions } from '@/lib/discoverOptions';
import type { SearchParams } from '@/hooks/useDependencyCheck';
import type { DiscoverType } from '@/store/useAppStore';

interface LeftPanelProps {
  onFilterChange: (filters: SearchParams['filters']) => void;
}

type Filters = SearchParams['filters'];

function makeInitialFilters(modVersion: string, loaderOptions: { value: string }[]): Filters {
  return {
    loaders: Object.fromEntries(loaderOptions.map((o) => [o.value, null])) as Record<string, string | null>,
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
  const loaderOptions = getLoaderOptions(discoverType);
  const [filters, setFilters] = useState<Filters>(() => makeInitialFilters(modVersion, getLoaderOptions(discoverType)));

  // Sync version filter when the global modVersion changes.
  useEffect(() => {
    setFilters((prev) => ({ ...prev, version: modVersion || '' }));
  }, [modVersion]);

  const discoverOptions = getDiscoverOptions(t);

  const emit = (newFilters: Filters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Keep refs so effects always see the latest values without re-running.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Reset category/loader filters and notify parent when project type changes.
  useEffect(() => {
    const newLoaders = Object.fromEntries(getLoaderOptions(discoverType).map((o) => [o.value, null])) as Record<string, string | null>;
    const reset = { ...filtersRef.current, categories: {}, loaders: newLoaders };
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
          {discoverOptions.map(({ type, label, icon }) => (
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
        <CollapsibleSection title={t.filters.version}>
          <CustomSelect
            options={[
              { value: '', label: t.filters.versionAny },
              ...gameVersions.map((v) => ({ value: v.version, label: v.version })),
            ]}
            value={filters.version ?? ''}
            onChange={setVersion}
          />
        </CollapsibleSection>

        {loaderOptions.length > 0 && (
          <CollapsibleSection title={t.filters.loader}>
            <div className="lp-filter-items">
              {loaderOptions.map(({ value, label }) => (
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
          </CollapsibleSection>
        )}

        {categoryGroups.length > 0 && categoryGroups.map(({ header, items }) => (
          <CollapsibleSection
            key={header}
            title={getCategoryHeaderLabel(header, t.filters.categoryHeaders)}
          >
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
          </CollapsibleSection>
        ))}

        {(discoverType === 'mod' || discoverType === 'modpack') && (
          <CollapsibleSection title={t.filters.environment}>
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
          </CollapsibleSection>
        )}

        <CollapsibleSection title={t.filters.license}>
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
        </CollapsibleSection>
      </div>
    </div>
  );
}
