'use client';

import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';
import shieldCheckIconRaw from '../../assets/icons/shield-check.svg';
import downloadIconRaw from '../../assets/icons/download.svg';

interface ActionBarProps {
  onCheckDeps: () => void;
  onDownload: () => void;
}

export default function ActionBar({ onCheckDeps, onDownload }: ActionBarProps) {
  const { selectedMods, clearMods } = useApp();
  const count = selectedMods.size;

  return (
    <div className={`action-bar ${count > 0 ? 'visible' : ''}`}>
      <div className="action-bar-top">
        <span className="selected-badge">{count} Selected</span>
        <button onClick={clearMods} className="btn-clear">Clear All</button>
      </div>
      <div className="action-buttons">
        <button onClick={onCheckDeps} className="btn-action btn-check">
          <Icon svg={shieldCheckIconRaw} size={16} /> Check
        </button>
        <button onClick={onDownload} className="btn-action btn-download">
          <Icon svg={downloadIconRaw} size={16} /> Download
        </button>
      </div>
    </div>
  );
}
