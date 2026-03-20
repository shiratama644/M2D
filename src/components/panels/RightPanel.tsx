'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModDetail from '../mods/ModDetail';
import SettingsContent from '../settings/SettingsContent';
import DebugPanel from '../debug/DebugPanel';
import { useGameVersions } from '../../hooks/useGameVersions';
import Icon from '../ui/Icon';
import { FALLBACK_ICON } from '../../lib/helpers';

import fileTextIconRaw from '../../assets/icons/file-text.svg';
import historyIconRaw from '../../assets/icons/history.svg';
import settingsIconRaw from '../../assets/icons/settings.svg';
import checkCircleIconRaw from '../../assets/icons/check-circle.svg';
import starIconRaw from '../../assets/icons/star.svg';
import terminalIconRaw from '../../assets/icons/terminal-square.svg';

type Tab = 'description' | 'history' | 'settings' | 'selected' | 'favorites' | 'console';

interface RightPanelProps {
  onHistorySearch: (query: string) => void;
}

export default function RightPanel({ onHistorySearch }: RightPanelProps) {
  const {
    selectedMods, removeMod,
    favorites, toggleFavorite, addMod,
    searchHistory, removeSearchHistory, clearSearchHistory,
    setSelectedModalOpen, modDataMap,
    debugMode,
    t,
  } = useApp();
  const gameVersions = useGameVersions();
  const [tab, setTab] = useState<Tab>('description');

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
          </button>
        ))}
      </div>

      <div className="rp-panel-body">
        {tab === 'description' && <ModDetail />}

        {tab === 'history' && (
          <div className="rp-history">
            <div className="rp-history-header">
              <span>{t.rightPanel.history}</span>
              <button onClick={clearSearchHistory} className="btn-text-sm">{t.history.clear}</button>
            </div>
            {searchHistory.length === 0 ? (
              <div className="rp-empty">{t.history.noHistory}</div>
            ) : (
              <div className="rp-history-list">
                {searchHistory.map((q) => (
                  <div key={q} className="rp-history-item">
                    <button
                      className="rp-history-query"
                      onClick={() => onHistorySearch(q)}
                    >
                      {q}
                    </button>
                    <button
                      className="rp-history-del"
                      onClick={() => removeSearchHistory(q)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
