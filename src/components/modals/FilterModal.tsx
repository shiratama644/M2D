'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getLoaderOptions, LOADER_ICON_PATHS, OTHER_FILTER_OPTIONS, getCategoryLabel, getCategoryHeaderLabel } from '@/lib/helpers';
import { CATEGORY_ICON_MAP } from '@/lib/categoryIcons';
import { useGameVersions } from '@/hooks/useGameVersions';
import { useCategoryGroups } from '@/hooks/useCategories';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterRow from '@/components/ui/FilterRow';
import MobileModal from '@/components/ui/MobileModal';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { SearchParams } from '@/hooks/useDependencyCheck';
import type { DiscoverType } from '@/store/useAppStore';

import filterIconRaw from '@/assets/icons/filter.svg';
import clientIconRaw from '@/assets/icons/client.svg';
import serverIconRaw from '@/assets/icons/server.svg';
import chevronDownRaw from '@/assets/icons/chevron-down.svg';
import cubeIconRaw from '@/assets/icons/cube.svg';
import packageIconRaw from '@/assets/icons/package.svg';
import imageIconRaw from '@/assets/icons/image.svg';
import sparklesIconRaw from '@/assets/icons/sparkles.svg';

interface FilterModalProps {
  filters: SearchParams['filters'];
  onFiltersChange: (filters: SearchParams['filters']) => void;
  onClose: () => void;
  projectType?: string;
  onProjectTypeChange?: (type: DiscoverType) => void;
}

/** Collapsible section for the mobile filter modal. */
function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="lp-filter-section" style={{ marginBottom: '1rem' }}>
      <button
        className="lp-filter-title lp-filter-title-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span>{title}</span>
        <Icon
          svg={chevronDownRaw}
          size={12}
          className={`lp-filter-chevron${open ? ' open' : ''}`}
        />
      </button>
      {open && <div className="lp-filter-section-body">{children}</div>}
    </div>
  );
}

export default function FilterModal({ filters, onFiltersChange, onClose, projectType = 'mod', onProjectTypeChange }: FilterModalProps) {
  const { t, modVersion, updateModVersion } = useApp();
  const gameVersions = useGameVersions();
  const [localProjectType, setLocalProjectType] = useState<DiscoverType>(projectType as DiscoverType);
  const categoryGroups = useCategoryGroups(localProjectType);
  const loaderOptions = getLoaderOptions(localProjectType);
  const [localFilters, setLocalFilters] = useState(filters);

  const DISCOVER_OPTIONS: Array<{ type: DiscoverType; label: string; icon: string }> = [
    { type: 'mod', label: t.discover.mod, icon: cubeIconRaw },
    { type: 'modpack', label: t.discover.modpack, icon: packageIconRaw },
    { type: 'resourcepack', label: t.discover.texture, icon: imageIconRaw },
    { type: 'shader', label: t.discover.shader, icon: sparklesIconRaw },
  ];

  const handleDiscoverTypeChange = (type: DiscoverType) => {
    setLocalProjectType(type);
    const newLoaders = Object.fromEntries(
      getLoaderOptions(type).map((o) => [o.value, null])
    ) as Record<string, string | null>;
    const resetFilters = { ...localFilters, categories: {}, loaders: newLoaders };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onProjectTypeChange?.(type);
  };

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
      <div className="fm-discover-section">
        <div className="lp-discover-btns">
          {DISCOVER_OPTIONS.map(({ type, label, icon }) => (
            <button
              key={type}
              className={cn('lp-discover-btn', localProjectType === type && 'active')}
              onClick={() => handleDiscoverTypeChange(type)}
            >
              <Icon svg={icon} size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <CollapsibleSection title={t.filters.version}>
        <CustomSelect
          options={[
            { value: '', label: t.filters.versionAny },
            ...gameVersions.map((v) => ({ value: v.version, label: v.version })),
          ]}
          value={localFilters.version ?? ''}
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
                state={(localFilters.loaders[value] ?? null) as string | null}
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
                state={((localFilters.categories ?? {})[name] ?? null) as string | null}
                onToggle={(s) => toggleCategory(name, s)}
              />
            ))}
          </div>
        </CollapsibleSection>
      ))}

      {(localProjectType === 'mod' || localProjectType === 'modpack') && (
        <CollapsibleSection title={t.filters.environment}>
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
        </CollapsibleSection>
      )}

      <CollapsibleSection title={t.filters.license}>
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
      </CollapsibleSection>
    </MobileModal>
  );
}
