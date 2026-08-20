'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import { useScrollLock } from '@/hooks/useScrollLock';
import { FALLBACK_ICON } from '@/lib/helpers';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';
import Icon from '@/components/ui/Icon';
import checkCircleIconRaw from '@/assets/icons/check-circle.svg';
import xIconRaw from '@/assets/icons/x.svg';

export default function SelectedModal() {
  const {
    selectedModalOpen,
    selectedMods, modDataMap, t,
  } = useApp();
  const engine = useEngine();
  const close = () => { void engine.emit('ui.close', { panel: 'selected' }); };
  const { loading: loadingDetails } = useResolveProjects(selectedMods);
  const [searchQuery, setSearchQuery] = useState('');
  useScrollLock(selectedModalOpen);

  useEffect(() => {
    if (!selectedModalOpen) {
      setSearchQuery('');
    }
  }, [selectedModalOpen]);

  if (!selectedModalOpen) return null;

  const ids = Array.from(selectedMods);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredIds = normalizedQuery
    ? ids.filter((id) => {
      const title = displayModTitle(modDataMap, id);
      return title.toLowerCase().includes(normalizedQuery) || id.toLowerCase().includes(normalizedQuery);
    })
    : ids;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal-container large">
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--primary-color)' }}>
            <Icon svg={checkCircleIconRaw} size={20} /> {t.nav.selected}
          </h3>
          <button onClick={close} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="modal-body">
          {ids.length === 0 ? (
            <div className="empty-state">{t.empty.noneSelected}</div>
          ) : loadingDetails ? (
            <div className="empty-state" style={{ color: 'var(--text-muted)' }}>{t.empty.loading}</div>
          ) : (
            <>
              <div className="selected-search-wrap">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.empty.searchSelected}
                  className="input-base"
                />
              </div>
              {filteredIds.length === 0 ? (
                <div className="empty-state" style={{ color: 'var(--text-muted)' }}>
                  {t.empty.noMatch}
                </div>
              ) : (
                <div className="selected-list">
                  {filteredIds.map((id) => {
                    const mod = lookupMod(modDataMap, id);
                    return (
                      <div key={id} className="selected-item">
                        <img
                          src={mod?.icon_url || FALLBACK_ICON}
                          className="selected-item-icon"
                          alt=""
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                        />
                        <span className="selected-item-title">{displayModTitle(modDataMap, id)}</span>
                        <button onClick={() => { void engine.emit('selection.remove', { id }); }} className="btn-small red-outline">{t.deps.remove}</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={close} className="btn-secondary">{t.deps.close}</button>
        </div>
      </div>
    </div>
  );
}
