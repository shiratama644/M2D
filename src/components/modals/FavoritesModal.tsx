'use client';

import { useApp } from '@/context/AppContext';
import MobileModal from '@/components/ui/MobileModal';
import { FALLBACK_ICON } from '@/lib/helpers';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';

import starIconRaw from '@/assets/icons/star.svg';

interface FavoritesModalProps {
  onClose: () => void;
}

export default function FavoritesModal({ onClose }: FavoritesModalProps) {
  const {
    favorites, toggleFavorite,
    selectedMods, addMod, removeMod,
    modDataMap,
    t,
  } = useApp();

  const { loading: loadingDetails } = useResolveProjects(favorites);

  return (
    <MobileModal
      title={t.rightPanel.favorites}
      titleIcon={starIconRaw}
      onClose={onClose}
      size="large"
      footer={
        <button onClick={onClose} className="btn-secondary">{t.settings.close}</button>
      }
    >
      <div className="rp-section">
        <div className="rp-section-header">
          <span>{t.rightPanel.favorites} ({favorites.size})</span>
        </div>
        {favorites.size === 0 ? (
          <div className="rp-empty">{t.favorites.noFavorites}</div>
        ) : loadingDetails ? (
          <div className="rp-empty" style={{ color: 'var(--text-muted)' }}>Loading details...</div>
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
                      onClick={() => isSelected ? removeMod(id) : addMod(id)}
                      className={`btn-small ${isSelected ? 'red-outline' : 'green'}`}
                    >
                      {isSelected ? t.favorites.removeFromSelected : t.favorites.addToSelected}
                    </button>
                    <button
                      onClick={() => toggleFavorite(id)}
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
    </MobileModal>
  );
}
