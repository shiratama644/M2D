'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../lib/api';
import MobileModal from '../ui/MobileModal';
import { FALLBACK_ICON } from '../../lib/helpers';

import starIconRaw from '../../assets/icons/star.svg';

interface FavoritesModalProps {
  onClose: () => void;
}

export default function FavoritesModal({ onClose }: FavoritesModalProps) {
  const {
    favorites, toggleFavorite,
    selectedMods, addMod, removeMod,
    modDataMap, updateModDataMap,
    t,
  } = useApp();

  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const ids = Array.from(favorites);
    const missing = ids.filter((id) => !modDataMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    setLoadingDetails(true);
    API.getProjects(missing)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, unknown> = {};
        data.forEach((p) => { map[p.id] = p; });
        updateModDataMap(map);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingDetails(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

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
              const mod = modDataMap[id] as { title?: string; icon_url?: string } | undefined;
              const isSelected = selectedMods.has(id);
              return (
                <div key={id} className="selected-item">
                  <img
                    src={mod?.icon_url || FALLBACK_ICON}
                    className="selected-item-icon"
                    alt="icon"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                  />
                  <span className="selected-item-title">{mod?.title || id}</span>
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
