'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import { FALLBACK_ICON } from '@/lib/helpers';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';

export default function FavoritesTab() {
  const {
    favorites,
    selectedMods,
    modDataMap,
    t,
  } = useApp();
  const engine = useEngine();
  const { loading } = useResolveProjects(favorites);

  return (
    <div className="rp-section">
      <div className="rp-section-header">
        <span>{t.rightPanel.favorites} ({favorites.size})</span>
      </div>
      {favorites.size === 0 ? (
        <div className="rp-empty">{t.favorites.noFavorites}</div>
      ) : loading ? (
        <div className="rp-empty" style={{ color: 'var(--text-muted)' }}>{t.empty.loading}</div>
      ) : (
        <div className="selected-list">
          {Array.from(favorites).map((id) => {
            const mod = lookupMod(modDataMap, id);
            const isSelected = selectedMods.has(id);
            return (
              <div key={id} className="selected-item">
                <img
                  src={mod?.icon_url || FALLBACK_ICON}
                  className="selected-item-icon"
                  alt="icon"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                />
                <span className="selected-item-title">{displayModTitle(modDataMap, id, t.mods.unknown)}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => { void engine.emit(isSelected ? 'selection.remove' : 'selection.add', { id }); }}
                    className={`btn-small ${isSelected ? 'red-outline' : 'green'}`}
                  >
                    {isSelected ? t.favorites.removeFromSelected : t.favorites.addToSelected}
                  </button>
                  <button
                    onClick={() => { void engine.emit('favorites.toggle', { id }); }}
                    className="btn-small red-outline"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
