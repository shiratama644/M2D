import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ModDetail from './ModDetail';
import CustomSelect from './CustomSelect';
import Icon from './Icon';
import { API } from '../utils/api';
import { LOADER_OPTIONS, LOADER_ICON_PATHS } from '../utils/helpers';

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

/* ─── Inline Settings Panel ─── */
function InlineSettings() {
  const {
    t, theme, toggleTheme,
    debugMode, toggleDebug,
    advancedConsole, toggleAdvancedConsole,
    fastSearch, toggleFastSearch,
    showCardDescription, toggleShowCardDescription,
    language, toggleLanguage,
    modLoader, updateModLoader,
    modVersion, updateModVersion,
    clearSearchHistory, clearFavorites,
    showConfirm,
  } = useApp();

  const [gameVersions, setGameVersions] = useState([]);

  useEffect(() => {
    API.getGameVersions().then(versions => {
      const releases = versions.filter(v => v.version_type === 'release');
      setGameVersions(releases);
    }).catch(e => console.error('Failed to load game versions:', e));
  }, []);

  const themeOptions = [
    { value: 'light', label: t.themes.light },
    { value: 'dark', label: t.themes.dark },
  ];

  const languageOptions = [
    { value: 'en', label: t.languages.en },
    { value: 'ja', label: t.languages.ja },
  ];

  const loaderOptions = [
    { value: '', label: t.loaders.any },
    ...LOADER_OPTIONS.map(o => ({
      ...o,
      icon: LOADER_ICON_PATHS[o.value]
        ? <Icon svg={LOADER_ICON_PATHS[o.value]} size={16} className="loader-icon-img" />
        : undefined,
    })),
  ];

  const handleClearHistory = async () => {
    if (await showConfirm(t.settings.clearHistory + '?')) clearSearchHistory();
  };

  const handleClearFavorites = async () => {
    if (await showConfirm(t.settings.clearFavorites + '?')) clearFavorites();
  };

  return (
    <div className="rp-inline-settings">
      <div className="settings-category">
        <h4 className="settings-category-title">{t.settings.categories.mods}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.modLoader.label}</span>
            <span className="settings-description">{t.settings.modLoader.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={loaderOptions}
            value={modLoader}
            onChange={updateModLoader}
          />
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.modVersion.label}</span>
            <span className="settings-description">{t.settings.modVersion.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={[
              ...(gameVersions.length > 0
                ? gameVersions.map(v => ({ value: v.version, label: v.version }))
                : (modVersion ? [{ value: modVersion, label: modVersion }] : [])),
            ]}
            value={modVersion}
            onChange={updateModVersion}
          />
        </div>
      </div>

      <div className="settings-category">
        <h4 className="settings-category-title">{t.settings.categories.general}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.theme.label}</span>
            <span className="settings-description">{t.settings.theme.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={themeOptions}
            value={theme}
            onChange={toggleTheme}
          />
        </div>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.language.label}</span>
            <span className="settings-description">{t.settings.language.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={languageOptions}
            value={language}
            onChange={toggleLanguage}
          />
        </div>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.fastSearch.label}</span>
            <span className="settings-description">{t.settings.fastSearch.description}</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" className="toggle-input" checked={fastSearch} onChange={e => toggleFastSearch(e.target.checked)} />
            <div className="toggle-bg"><div className="toggle-knob"></div></div>
          </label>
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.showCardDescription.label}</span>
            <span className="settings-description">{t.settings.showCardDescription.description}</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" className="toggle-input" checked={showCardDescription} onChange={e => toggleShowCardDescription(e.target.checked)} />
            <div className="toggle-bg"><div className="toggle-knob"></div></div>
          </label>
        </div>
      </div>

      <div className="settings-category">
        <h4 className="settings-category-title">Data</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.clearHistory}</span>
            <span className="settings-description">{t.settings.clearHistoryDesc}</span>
          </div>
          <button onClick={handleClearHistory} className="btn-secondary settings-btn-sm">Clear</button>
        </div>
        <div className="settings-row settings-row-last">
          <div>
            <span className="settings-label">{t.settings.clearFavorites}</span>
            <span className="settings-description">{t.settings.clearFavoritesDesc}</span>
          </div>
          <button onClick={handleClearFavorites} className="btn-secondary settings-btn-sm">Clear</button>
        </div>
      </div>

      <div className="settings-category" style={{ marginBottom: 0 }}>
        <h4 className="settings-category-title">{t.settings.categories.developerMode}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.debugMode.label}</span>
            <span className="settings-description">{t.settings.debugMode.description}</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" className="toggle-input" checked={debugMode} onChange={e => toggleDebug(e.target.checked)} />
            <div className="toggle-bg"><div className="toggle-knob"></div></div>
          </label>
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.advancedConsole.label}</span>
            <span className="settings-description">{t.settings.advancedConsole.description}</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" className="toggle-input" checked={advancedConsole} onChange={e => toggleAdvancedConsole(e.target.checked)} />
            <div className="toggle-bg"><div className="toggle-knob"></div></div>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ─── Upper panel ─── */
function UpperPanel({ onHistorySearch }) {
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
            onClick={() => setTab(tb.id)}
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
        {tab === 'settings' && <InlineSettings />}
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
export default function RightPanel({ onHistorySearch }) {
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
        <UpperPanel onHistorySearch={onHistorySearch} />
      </div>
      <div className="rp-resizer" onMouseDown={onMouseDown} />
      <div className="rp-lower" style={{ height: `${100 - upperHeight}%` }}>
        <LowerPanel />
      </div>
    </div>
  );
}
