'use client';

import { useApp } from '@/context/AppContext';
import { FALLBACK_ICON } from '@/lib/helpers';

export default function SelectedTab() {
  const { selectedMods, removeMod, modDataMap, setSelectedModalOpen, t } = useApp();

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
      ) : (
        <div className="selected-list">
          {Array.from(selectedMods).map((id) => {
            const mod = modDataMap[id] as { title?: string; icon_url?: string } | undefined;
            return (
              <div key={id} className="selected-item">
                <img
                  src={mod?.icon_url || FALLBACK_ICON}
                  className="selected-item-icon"
                  alt="icon"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                />
                <span className="selected-item-title">{mod?.title || id}</span>
                <button onClick={() => removeMod(id)} className="btn-small red-outline">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
