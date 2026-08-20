'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import { FALLBACK_ICON } from '@/lib/helpers';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';

export default function SelectedTab() {
  const { selectedMods, modDataMap, t } = useApp();
  const engine = useEngine();
  const { loading } = useResolveProjects(selectedMods);

  return (
    <div className="rp-section">
      <div className="rp-section-header">
        <span>{t.rightPanel.selected} ({selectedMods.size})</span>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'selected' }); }}
          className="btn-text-sm"
        >
          {t.empty.manage}
        </button>
      </div>
      {selectedMods.size === 0 ? (
        <div className="rp-empty">{t.empty.noneSelected}</div>
      ) : loading ? (
        <div className="rp-empty" style={{ color: 'var(--text-muted)' }}>{t.empty.loading}</div>
      ) : (
        <div className="selected-list">
          {Array.from(selectedMods).map((id) => {
            const mod = lookupMod(modDataMap, id);
            return (
              <div key={id} className="selected-item">
                <img
                  src={mod?.icon_url || FALLBACK_ICON}
                  className="selected-item-icon"
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                />
                <span className="selected-item-title">{displayModTitle(modDataMap, id, t.mods.unknown)}</span>
                <button onClick={() => { void engine.emit('selection.remove', { id }); }} className="btn-small red-outline">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
