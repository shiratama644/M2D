'use client';

import { useApp } from '@/context/AppContext';
import Icon from '@/components/ui/Icon';
import checkIconRaw from '@/assets/icons/check.svg';
import banIconRaw from '@/assets/icons/ban.svg';

interface FilterRowProps {
  label: string;
  iconSvg?: string;
  iconClassName?: string;
  state: string | null;
  onToggle: (state: string) => void;
}

export default function FilterRow({ label, iconSvg, iconClassName, state, onToggle }: FilterRowProps) {
  const { t } = useApp();
  return (
    <div className="lp-filter-row">
      <span className="lp-filter-label">
        {iconSvg && <Icon svg={iconSvg} size={14} className={iconClassName} />}
        {label}
      </span>
      <div className="lp-filter-btns">
        <button
          className={`btn-filter-state${state === 'include' ? ' active-include' : ''}`}
          title={t.filters.include}
          onClick={() => onToggle('include')}
        >
          <Icon svg={checkIconRaw} size={14} />
          <span aria-hidden="true">{t.filters.include}</span>
        </button>
        <button
          className={`btn-filter-state${state === 'exclude' ? ' active-exclude' : ''}`}
          title={t.filters.exclude}
          onClick={() => onToggle('exclude')}
        >
          <Icon svg={banIconRaw} size={14} />
          <span aria-hidden="true">{t.filters.exclude}</span>
        </button>
      </div>
    </div>
  );
}
