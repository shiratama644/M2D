'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../lib/api';
import Icon from '../ui/Icon';
import checkCircleIconRaw from '../../assets/icons/check-circle.svg';
import xIconRaw from '../../assets/icons/x.svg';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';

export default function SelectedModal() {
  const {
    selectedModalOpen, setSelectedModalOpen,
    selectedMods, removeMod, modDataMap, updateModDataMap,
  } = useApp();
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!selectedModalOpen) return;
    const ids = Array.from(selectedMods);
    const missing = ids.filter((id) => !modDataMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    setLoadingDetails(true);
    API.getProjects(missing)
      .then((data) => {
        if (cancelled) return;
        const map = {};
        data.forEach((p) => { map[p.id] = p; });
        updateModDataMap(map);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingDetails(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModalOpen]);

  if (!selectedModalOpen) return null;

  const ids = Array.from(selectedMods);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && setSelectedModalOpen(false)}
    >
      <div className="modal-container large">
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--primary-color)' }}>
            <Icon svg={checkCircleIconRaw} size={20} /> Selected Mods
          </h3>
          <button onClick={() => setSelectedModalOpen(false)} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="modal-body">
          {ids.length === 0 ? (
            <div className="empty-state">No mods selected.</div>
          ) : loadingDetails ? (
            <div className="empty-state" style={{ color: 'var(--text-muted)' }}>Loading details...</div>
          ) : (
            <div className="selected-list">
              {ids.map((id) => {
                const mod = modDataMap[id];
                return (
                  <div key={id} className="selected-item">
                    <img
                      src={mod?.icon_url || FALLBACK_ICON}
                      className="selected-item-icon"
                      alt="icon"
                      onError={(e) => { e.target.src = FALLBACK_ICON; }}
                    />
                    <span className="selected-item-title">{mod?.title || id}</span>
                    <button onClick={() => removeMod(id)} className="btn-small red-outline">Remove</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={() => setSelectedModalOpen(false)} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
