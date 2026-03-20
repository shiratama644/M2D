'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LOADER_OPTIONS, LOADER_ICON_PATHS, OTHER_FILTER_OPTIONS, getCategoryLabel, getCategoryHeaderLabel } from '../../lib/helpers';
import { CATEGORY_ICON_MAP } from '../../lib/categoryIcons';
import { useGameVersions } from '../../hooks/useGameVersions';
import { useCategories, useCategoryGroups } from '../../hooks/useCategories';
import CustomSelect from '../ui/CustomSelect';
import FilterRow from '../ui/FilterRow';
import MobileModal from '../ui/MobileModal';
import type { SearchParams } from '../../hooks/useDependencyCheck';

import filterIconRaw from '../../assets/icons/filter.svg';
import clientIconRaw from '../../assets/icons/client.svg';
import serverIconRaw from '../../assets/icons/server.svg';

interface FilterModalProps {
  filters: SearchParams['filters'];
  onFiltersChange: (filters: SearchParams['filters']) => void;
  onClose: () => void;
  projectType?: string;
}

export default function FilterModal({ filters, onFiltersChange, onClose, projectType = 'mod' }: FilterModalProps) {
  const { t, modVersion, updateModVersion } = useApp();
  const gameVersions = useGameVersions();
  const categories = useCategories(projectType);
  const [localFilters, setLocalFilters] = useState(filters);

  const emit = (newFilters: typeof localFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const setVersion = (v: string) => {
    const newFilters = { ...localFilters, version: v };
    if (v && v !== modVersion) updateModVersion(v);
    emit(newFilters);
  };

  const toggleLoader = (loader: string, state: string) => {
    emit({
      ...localFilters,
      loaders: {
        ...localFilters.loaders,
        [loader]: localFilters.loaders[loader] === state ? null : state,
      },
    });
  };

  const toggleCategory = (cat: string, state: string) => {
    emit({
      ...localFilters,
      categories: {
        ...(localFilters.categories ?? {}),
        [cat]: (localFilters.categories ?? {})[cat] === state ? null : state,
      },
    });
  };

  const toggleEnvironment = (side: 'client_side' | 'server_side', state: string) => {
    emit({
      ...localFilters,
      environment: {
        ...(localFilters.environment ?? { client_side: null, server_side: null }),
        [side]: (localFilters.environment ?? {})[side] === state ? null : state,
      },
    });
  };

  const toggleOther = (key: string, state: string) => {
    emit({
      ...localFilters,
      other: {
        ...(localFilters.other ?? {}),
        [key]: (localFilters.other ?? {})[key] === state ? null : state,
      },
    });
  };

  return (
    <MobileModal
      title={t.filters.title}
      titleIcon={filterIconRaw}
      onClose={onClose}
      size="large"
      footer={<button onClick={onClose} className="btn-secondary">{t.settings.close}</button>}
    >
      <div className="lp-filter-section" style={{ marginBottom: '1rem' }}>
        <h4 className="lp-filter-title">{t.filters.version}</h4>
        <CustomSelect
          options={[
            { value: '', label: t.filters.versionAny },
            ...gameVersions.map((v) => ({ value: v.version, label: v.version })),
          ]}
          value={localFilters.version ?? ''}
          onChange={setVersion}
        />
      </div>

      <div className="lp-filter-section" style={{ marginBottom: '1rem' }}>
        <h4 className="lp-filter-title">{t.filters.loader}</h4>
        <div className="lp-filter-items">
          {LOADER_OPTIONS.map(({ value, label }) => (
            <FilterRow
              key={value}
              label={label}
              iconSvg={LOADER_ICON_PATHS[value]}
              iconClassName="loader-icon-img"
              state={(localFilters.loaders[value] ?? null) as string | null}
              onToggle={(s) => toggleLoader(value, s)}
            />
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="lp-filter-section" style={{ marginBottom: '1rem' }}>
          <h4 className="lp-filter-title">{t.filters.categories}</h4>
          <div className="lp-filter-items">
            {categories.map(({ name }) => (
              <FilterRow
                key={name}
                label={getCategoryLabel(name, t.categories)}
                iconSvg={CATEGORY_ICON_MAP[name]}
                iconClassName="category-icon-img"
                state={((localFilters.categories ?? {})[name] ?? null) as string | null}
                onToggle={(s) => toggleCategory(name, s)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="lp-filter-section" style={{ marginBottom: '1rem' }}>
        <h4 className="lp-filter-title">{t.filters.environment}</h4>
        <div className="lp-filter-items">
          {([
            { key: 'client_side' as const, label: t.filters.clientSide, iconSvg: clientIconRaw },
            { key: 'server_side' as const, label: t.filters.serverSide, iconSvg: serverIconRaw },
          ]).map(({ key, label, iconSvg }) => (
            <FilterRow
              key={key}
              label={label}
              iconSvg={iconSvg}
              state={((localFilters.environment ?? {})[key] ?? null) as string | null}
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
              state={((localFilters.other ?? {})[value] ?? null) as string | null}
              onToggle={(s) => toggleOther(value, s)}
            />
          ))}
        </div>
      </div>
    </MobileModal>
  );
}
