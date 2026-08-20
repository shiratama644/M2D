'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import Icon from '@/components/ui/Icon';
import gitGraphIconRaw from '@/assets/icons/git-graph.svg';
import downloadIconRaw from '@/assets/icons/download.svg';
import { interpolate } from '@/lib/utils';

interface ActionBarProps {
  onCheckDeps: () => void;
  onDownload: () => void;
}

export default function ActionBar({ onCheckDeps, onDownload }: ActionBarProps) {
  const { selectedMods, t } = useApp();
  const engine = useEngine();
  const count = selectedMods.size;

  return (
    <div className={`action-bar ${count > 0 ? 'visible' : ''}`}>
      <div className="action-bar-top">
        <span className="selected-badge">{interpolate(t.actionBar.selected, { n: count })}</span>
        {count > 0 && (
          <button onClick={() => { void engine.emit('selection.clear', undefined); }} className="btn-clear">
            {t.actionBar.clearAll}
          </button>
        )}
      </div>
      {count > 0 && (
        <div className="action-buttons">
          <button onClick={onCheckDeps} className="btn-action btn-check">
            <Icon svg={gitGraphIconRaw} size={16} /> {t.actionBar.checkDeps}
          </button>
          <button onClick={onDownload} className="btn-action btn-download">
            <Icon svg={downloadIconRaw} size={16} /> {t.actionBar.download}
          </button>
        </div>
      )}
    </div>
  );
}
