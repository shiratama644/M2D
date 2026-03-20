'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, CATEGORY_OPTIONS, OTHER_FILTER_OPTIONS } from '../../lib/helpers';
import { CATEGORY_ICON_MAP } from '../../lib/categoryIcons';
import { useGameVersions } from '../../hooks/useGameVersions';
import CustomSelect from '../ui/CustomSelect';
import FilterRow from '../ui/FilterRow';
import type { SearchParams } from '../../hooks/useDependencyCheck';

interface LeftPanelProps {
  onFilterChange: (filters: SearchParams['filters']) => void;
}

type Filters = SearchParams['filters'];

function makeInitialFilters(modVersion: string): Filters {
  return {
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>,
    categories: Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>,
    environment: { client_side: null, server_side: null },
    other: Object.fromEntries(OTHER_FILTER_OPTIONS.map((o) => [o.value, null])) as Record<string, string | null>,
    version: modVersion || '',
  };
}

export default function LeftPanel({ onFilterChange }: LeftPanelProps) {
  const { t, modVersion, updateModVersion } = useApp();
  const gameVersions = useGameVersions();
  const [filters, setFilters] = useState<Filters>(() => makeInitialFilters(modVersion));

  const [prevModVersion, setPrevModVersion] = useState(modVersion);
  if (prevModVersion !== modVersion) {
    setPrevModVersion(modVersion);
    setFilters((prev) => ({ ...prev, version: modVersion || '' }));
  }

  const emit = (newFilters: Filters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

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

      <div className="lp-filter-section">
        <h4 className="lp-filter-title">{t.filters.categories}</h4>
        <div className="lp-filter-items">
          {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
            <FilterRow
              key={value}
              label={t.categories[labelKey as keyof typeof t.categories]}
              iconSvg={CATEGORY_ICON_MAP[value]}
              iconClassName="category-icon-img"
              state={((filters.categories ?? {})[value] ?? null) as string | null}
              onToggle={(s) => toggleCategory(value, s)}
            />
          ))}
        </div>
      </div>

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
