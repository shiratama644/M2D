import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ModDetail from './ModDetail';
import Icon from './Icon';
import { API } from '../utils/api';

import fileTextIconRaw from '../assets/icons/file-text.svg?raw';
import historyIconRaw from '../assets/icons/history.svg?raw';
import settingsIconRaw from '../assets/icons/settings.svg?raw';
import checkCircleIconRaw from '../assets/icons/check-circle.svg?raw';
import starIconRaw from '../assets/icons/star.svg?raw';
import terminalIconRaw from '../assets/icons/terminal-square.svg?raw';
import xIconRaw from '../assets/icons/x.svg?raw';
import trashIconRaw from '../assets/icons/trash.svg?raw';
import plusIconRaw from '../assets/icons/package-plus.svg?raw';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';
const LEVEL_COLORS = { log: '#cbd5e1', info: '#7dd3fc', warn: '#facc15', error: '#f87171' };

/* ─── Upper panel ─── */
function UpperPanel({ onSettingsClick, onHistorySearch }) {
  const { t, searchHistory, removeSearchHistory, clearSearchHistory } = useApp();
  const [tab, setTab] = useState('description');

  const tabs = [
    { id: 'description', label: t.rightPanel.description, icon: fileTextIconRaw },
    { id: 'history',     label: t.rightPanel.history,     icon: historyIconRaw },
    { id: 'settings',   label: t.rightPanel.settings,    icon: settingsIconRaw },
  ];

  return (
    <div className="rp-panel">
      <div className="rp-tabs">
        {tabs.map(tb => (
          <button
            key={tb.id}
            className={`rp-tab-btn ${tab === tb.id ? 'active' : ''}`}
            onClick={() => {
              if (tb.id === 'settings') { onSettingsClick(); return; }
              setTab(tb.id);
            }}
          >
            <Icon svg={tb.icon} size={14} />
            <span>{tb.label}</span>
          </button>
        ))}
      </div>
      <div className="rp-panel-body">
        {tab === 'description' && <ModDetail />}
        {tab === 'history' && (
          <div className="rp-history">
            {searchHistory.length === 0 ? (
              <div className="rp-empty">{t.history.noHistory}</div>
            ) : (
              <>
                <div className="rp-history-header">
                  <button className="btn-small red-outline" onClick={clearSearchHistory}>
                    <Icon svg={trashIconRaw} size={12} /> {t.history.clear}
                  </button>
                </div>
                <div className="rp-history-list">
                  {searchHistory.map((q, i) => (
                    <div key={i} className="rp-history-item">
                      <button className="rp-history-query" onClick={() => onHistorySearch(q)}>{q}</button>
                      <button className="rp-history-del" onClick={() => removeSearchHistory(q)}>
                        <Icon svg={xIconRaw} size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Lower panel ─── */
function LowerPanel() {
  const {
    t, debugMode, debugLogs, clearDebugLogs,
    selectedMods, removeMod, modDataMap, updateModDataMap,
    favorites, toggleFavorite, addMod,
  } = useApp();
  const [tab, setTab] = useState('selected');
  const [filterLevel, setFilterLevel] = useState('all');
  const logsRef = useRef(null);

  const tabs = [
    { id: 'selected',  label: t.rightPanel.selected,  icon: checkCircleIconRaw },
    { id: 'favorites', label: t.rightPanel.favorites, icon: starIconRaw },
    ...(debugMode ? [{ id: 'console', label: t.rightPanel.console, icon: terminalIconRaw }] : []),
  ];

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [debugLogs, filterLevel]);

  // Load missing mod data for favorites
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const favIds = Array.from(favorites);
    const missing = favIds.filter(id => !modDataMap[id]);
    if (missing.length === 0) return;
    API.getProjects(missing)
      .then(data => {
        const map = {};
        data.forEach(p => { map[p.id] = p; });
        updateModDataMap(map);
        forceUpdate(n => n + 1);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const selectedIds = Array.from(selectedMods);
  const favIds = Array.from(favorites);
  const LEVELS = ['all', 'log', 'info', 'warn', 'error'];
  const filteredLogs = filterLevel === 'all' ? debugLogs : debugLogs.filter(e => e.level === filterLevel);
  const counts = debugLogs.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});

  return (
    <div className="rp-panel">
      <div className="rp-tabs">
        {tabs.map(tb => (
          <button key={tb.id} className={`rp-tab-btn ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
            <Icon svg={tb.icon} size={14} />
            <span>{tb.label}</span>
            {tb.id === 'selected' && selectedMods.size > 0 && (
              <span className="rp-count-badge">{selectedMods.size}</span>
            )}
            {tb.id === 'favorites' && favorites.size > 0 && (
              <span className="rp-count-badge">{favorites.size}</span>
            )}
          </button>
        ))}
      </div>
      <div className="rp-panel-body">
        {tab === 'selected' && (
          <div className="rp-selected-list">
            {selectedIds.length === 0 ? (
              <div className="rp-empty">No mods selected.</div>
            ) : (
              selectedIds.map(id => {
                const mod = modDataMap[id];
                return (
                  <div key={id} className="rp-mod-item">
                    <img src={mod?.icon_url || FALLBACK_ICON} className="rp-mod-icon" alt="icon"
                      onError={e => { e.target.src = FALLBACK_ICON; }} />
                    <span className="rp-mod-title">{mod?.title || id}</span>
                    <button onClick={() => removeMod(id)} className="btn-small red-outline">
                      <Icon svg={xIconRaw} size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
        {tab === 'favorites' && (
          <div className="rp-selected-list">
            {favIds.length === 0 ? (
              <div className="rp-empty">{t.favorites.noFavorites}</div>
            ) : (
              favIds.map(id => {
                const mod = modDataMap[id];
                const isSel = selectedMods.has(id);
                return (
                  <div key={id} className="rp-mod-item">
                    <img src={mod?.icon_url || FALLBACK_ICON} className="rp-mod-icon" alt="icon"
                      onError={e => { e.target.src = FALLBACK_ICON; }} />
                    <span className="rp-mod-title">{mod?.title || id}</span>
                    <button
                      onClick={() => isSel ? removeMod(id) : addMod(id)}
                      className={`btn-small ${isSel ? 'red-outline' : 'green'}`}
                      title={isSel ? t.favorites.removeFromSelected : t.favorites.addToSelected}
                    >
                      <Icon svg={isSel ? xIconRaw : plusIconRaw} size={10} />
                    </button>
                    <button onClick={() => toggleFavorite(id)} className="btn-small rp-fav-mod-star" title="Remove from favorites">
                      <Icon svg={starIconRaw} size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
        {tab === 'console' && debugMode && (
          <div className="rp-console">
            <div className="rp-console-toolbar">
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    className={`debug-filter-btn ${filterLevel === lvl ? 'active' : ''}`}
                    style={filterLevel === lvl && lvl !== 'all' ? { borderColor: LEVEL_COLORS[lvl], color: LEVEL_COLORS[lvl] } : {}}
                    onClick={() => setFilterLevel(lvl)}
                  >
                    {lvl === 'all' ? 'All' : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    {lvl !== 'all' && counts[lvl] ? <span className="debug-filter-count">{counts[lvl]}</span> : null}
                  </button>
                ))}
              </div>
              <button onClick={clearDebugLogs} className="debug-action-btn" title="Clear">
                <Icon svg={trashIconRaw} size={12} />
              </button>
            </div>
            <div ref={logsRef} className="rp-console-logs debug-logs">
              {filteredLogs.length === 0 ? (
                <div className="debug-empty">No logs.</div>
              ) : filteredLogs.map((entry, i) => (
                <div key={i} className={`log-entry log-${entry.level}`}>
                  <span className="log-time">{entry.time}</span>
                  <span className="log-level-badge">{entry.level.toUpperCase()}</span>
                  <span className="log-msg">{entry.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── RightPanel with resizer ─── */
export default function RightPanel({ onSettingsClick, onHistorySearch }) {
  const [upperHeight, setUpperHeight] = useState(55); // percentage
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = Math.min(80, Math.max(20, (y / rect.height) * 100));
      setUpperHeight(pct);
    };
    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="right-panel">
      <div className="rp-upper" style={{ height: `${upperHeight}%` }}>
        <UpperPanel onSettingsClick={onSettingsClick} onHistorySearch={onHistorySearch} />
      </div>
      <div className="rp-resizer" onMouseDown={onMouseDown} />
      <div className="rp-lower" style={{ height: `${100 - upperHeight}%` }}>
        <LowerPanel />
      </div>
    </div>
  );
}
