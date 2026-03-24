'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { API } from '../../lib/api';
import ModDetail from '../mods/ModDetail';
import SettingsContent from '../settings/SettingsContent';
import DebugPanel from '../debug/DebugPanel';
import { useGameVersions } from '../../hooks/useGameVersions';
import Icon from '../ui/Icon';
import { FALLBACK_ICON, countActiveFilters } from '../../lib/helpers';
import type { SearchContextEntry } from '../../store/useAppStore';

/** Maps store language keys to BCP-47 locale strings for Intl formatting. */
const LOCALE_MAP: Record<string, string> = { en: 'en-US', ja: 'ja-JP' };

import fileTextIconRaw from '../../assets/icons/file-text.svg';
import historyIconRaw from '../../assets/icons/history.svg';
import settingsIconRaw from '../../assets/icons/settings.svg';
import checkCircleIconRaw from '../../assets/icons/check-circle.svg';
import starIconRaw from '../../assets/icons/star.svg';
import terminalIconRaw from '../../assets/icons/terminal-square.svg';

type Tab = 'description' | 'history' | 'settings' | 'selected' | 'favorites' | 'console';

interface RightPanelProps {
  onContextRestore: (entry: SearchContextEntry) => void;
}

/** Format a Unix timestamp for display in the history list. */
function formatHistoryTime(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return (
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

export default function RightPanel({ onContextRestore }: RightPanelProps) {
  const {
    selectedMods, removeMod,
    favorites, toggleFavorite, addMod,
    searchHistory, removeSearchHistory, clearSearchHistory,
    contextHistory, removeContextEntry, clearContextHistory,
    setSelectedModalOpen, modDataMap, updateModDataMap,
    debugMode, language,
    t,
  } = useApp();
  const gameVersions = useGameVersions();
  const [tab, setTab] = useState<Tab>('description');
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    if (tab !== 'favorites') return;
    const ids = Array.from(favorites);
    const missing = ids.filter((id) => !modDataMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    setLoadingFavorites(true);
    API.getProjects(missing)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, unknown> = {};
        data.forEach((p) => { map[p.id] = p; });
        updateModDataMap(map);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingFavorites(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, favorites]);

  const tabs: Array<{ id: Tab; icon: string; label: string }> = [
    { id: 'description', icon: fileTextIconRaw, label: t.rightPanel.description },
    { id: 'history', icon: historyIconRaw, label: t.rightPanel.history },
    { id: 'settings', icon: settingsIconRaw, label: t.rightPanel.settings },
    { id: 'selected', icon: checkCircleIconRaw, label: t.rightPanel.selected },
    { id: 'favorites', icon: starIconRaw, label: t.rightPanel.favorites },
    ...(debugMode ? [{ id: 'console' as Tab, icon: terminalIconRaw, label: t.rightPanel.console }] : []),
  ];

  return (
    <div className="right-panel">
      <div className="rp-tabs">
        {tabs.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`rp-tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            title={label}
          >
            <Icon svg={icon} size={16} />
            <span className="rp-tab-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="rp-panel-body">
        {tab === 'description' && <ModDetail />}

        {tab === 'history' && (
          <div className="rp-history">
            <div className="rp-history-header">
              <span>{t.rightPanel.history}</span>
              <button onClick={clearContextHistory} className="btn-text-sm">{t.history.clear}</button>
            </div>
            {contextHistory.length === 0 ? (
              <div className="rp-empty">{t.history.noHistory}</div>
            ) : (
              <div className="rp-history-list">
                {[...contextHistory].reverse().map((entry) => {
                  const filterCount = countActiveFilters(entry.filters);
                  const projectTypeLabel: Record<string, string> = {
                    mod: t.discover.mod,
                    modpack: t.discover.modpack,
                    resourcepack: t.discover.texture,
                    shader: t.discover.shader,
                  };
                  return (
                    <div key={entry.id} className="rp-history-item">
                      <button
                        className="rp-history-query"
                        onClick={() => onContextRestore(entry)}
                        title={t.history.restore}
                      >
                        <span className="rp-history-badge">
                          {projectTypeLabel[entry.projectType] ?? entry.projectType}
                        </span>
                        <span className="rp-history-text">
                          {entry.query || <em>{t.history.emptyQuery}</em>}
                        </span>
                        <span className="rp-history-meta">
                          {filterCount > 0
                            ? t.history.filterCount.replace('%n', String(filterCount))
                            : t.history.noFilters}
                          {' · '}
                          {formatHistoryTime(entry.timestamp, LOCALE_MAP[language] ?? 'en-US')}
                        </span>
                      </button>
                      <button
                        className="rp-history-del"
                        onClick={() => removeContextEntry(entry.id)}
                        title={t.history.deleteEntry}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && <SettingsContent gameVersions={gameVersions} />}

        {tab === 'selected' && (
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
        )}

        {tab === 'favorites' && (
          <div className="rp-section">
            <div className="rp-section-header">
              <span>{t.rightPanel.favorites} ({favorites.size})</span>
            </div>
            {favorites.size === 0 ? (
              <div className="rp-empty">{t.favorites.noFavorites}</div>
            ) : loadingFavorites ? (
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
        )}

        {tab === 'console' && debugMode && <DebugPanel />}
      </div>
    </div>
  );
}
