'use client';

import { useApp } from '../../context/AppContext';
import Icon from './Icon';
import checkIconRaw from '../../assets/icons/check.svg';
import banIconRaw from '../../assets/icons/ban.svg';

/**
 * A single include/exclude filter row used by both LeftPanel and FilterModal.
 *
 * Props:
 *   label        – text label for the filter item
 *   iconSvg      – optional SVG string for the leading icon
 *   iconClassName – optional className for the leading icon
 *   state        – current filter state: 'include' | 'exclude' | null
 *   onToggle     – callback(clickedState: 'include'|'exclude') called whenever a
 *                  button is clicked; the parent component is responsible for
 *                  toggling the state off when the same button is clicked twice
 */
export default function FilterRow({ label, iconSvg, iconClassName, state, onToggle }) {
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
