'use client';

import { useApp } from '@/context/AppContext';
import { FALLBACK_ICON } from '@/lib/helpers';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';

export default function SelectedTab() {
  const { selectedMods, removeMod, modDataMap, setSelectedModalOpen, t } = useApp();
  const { loading } = useResolveProjects(selectedMods);

  return (
    <div className="rp-section">
      <div className="rp-section-header">
        <span>{t.rightPanel.selected} ({selectedMods.size})</span>
        <button
          onClick={() => setSelectedModalOpen(true)}
          className="btn-text-sm"
        >
          Manage
        </button>
      </div>
      {selectedMods.size === 0 ? (
        <div className="rp-empty">None selected.</div>
      ) : loading ? (
        <div className="rp-empty" style={{ color: 'var(--text-muted)' }}>Loading details...</div>
      ) : (
        <div className="selected-list">
          {Array.from(selectedMods).map((id) => {
            const mod = lookupMod(modDataMap, id);
            return (
              <div key={id} className="selected-item">
                <img
                  src={mod?.icon_url || FALLBACK_ICON}
                  className="selected-item-icon"
                  alt="icon"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                />
                <span className="selected-item-title">{displayModTitle(modDataMap, id, t.mods.unknown)}</span>
                <button onClick={() => removeMod(id)} className="btn-small red-outline">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
