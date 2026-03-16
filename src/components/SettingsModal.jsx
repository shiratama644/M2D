import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';
import Icon from './Icon';
import { LOADER_OPTIONS, LOADER_ICON_PATHS } from '../utils/helpers';
import { API } from '../utils/api';
import settingsIconRaw from '../assets/icons/settings.svg?raw';
import xIconRaw from '../assets/icons/x.svg?raw';

export default function SettingsModal() {
  const {
    settingsOpen, setSettingsOpen,
    theme, toggleTheme,
    debugMode, toggleDebug,
    advancedConsole, toggleAdvancedConsole,
    fastSearch, toggleFastSearch,
    showCardDescription, toggleShowCardDescription,
    language, toggleLanguage,
    modLoader, updateModLoader,
    modVersion, updateModVersion,
    clearSearchHistory, clearFavorites,
    showConfirm,
    t,
  } = useApp();

  const [gameVersions, setGameVersions] = useState([]);

  useEffect(() => {
    if (!settingsOpen) return;
    API.getGameVersions().then(versions => {
      const releases = versions.filter(v => v.version_type === 'release');
      setGameVersions(releases);
    }).catch(e => console.error('Failed to load game versions:', e));
  }, [settingsOpen]);

  if (!settingsOpen) return null;

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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">
            <Icon svg={settingsIconRaw} size={20} /> {t.settings.title}
          </h3>
          <button onClick={() => setSettingsOpen(false)} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="modal-body">
          {/* Mods Category */}
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

          {/* General Category */}
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
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={fastSearch}
                  onChange={e => toggleFastSearch(e.target.checked)}
                />
                <div className="toggle-bg"><div className="toggle-knob"></div></div>
              </label>
            </div>
            <div className="settings-row" style={{ marginBottom: 0 }}>
              <div>
                <span className="settings-label">{t.settings.showCardDescription.label}</span>
                <span className="settings-description">{t.settings.showCardDescription.description}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={showCardDescription}
                  onChange={e => toggleShowCardDescription(e.target.checked)}
                />
                <div className="toggle-bg"><div className="toggle-knob"></div></div>
              </label>
            </div>
          </div>

          {/* Data Management */}
          <div className="settings-category">
            <h4 className="settings-category-title">Data</h4>
            <div className="settings-row">
              <div>
                <span className="settings-label">{t.settings.clearHistory}</span>
                <span className="settings-description">{t.settings.clearHistoryDesc}</span>
              </div>
              <button onClick={handleClearHistory} className="btn-secondary settings-btn-sm">
                Clear
              </button>
            </div>
            <div className="settings-row settings-row-last">
              <div>
                <span className="settings-label">{t.settings.clearFavorites}</span>
                <span className="settings-description">{t.settings.clearFavoritesDesc}</span>
              </div>
              <button onClick={handleClearFavorites} className="btn-secondary settings-btn-sm">
                Clear
              </button>
            </div>
          </div>

          {/* Developer Mode Category */}
          <div className="settings-category" style={{ marginBottom: 0 }}>
            <h4 className="settings-category-title">{t.settings.categories.developerMode}</h4>
            <div className="settings-row">
              <div>
                <span className="settings-label">{t.settings.debugMode.label}</span>
                <span className="settings-description">{t.settings.debugMode.description}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={debugMode}
                  onChange={e => toggleDebug(e.target.checked)}
                />
                <div className="toggle-bg"><div className="toggle-knob"></div></div>
              </label>
            </div>
            <div className="settings-row" style={{ marginBottom: 0 }}>
              <div>
                <span className="settings-label">{t.settings.advancedConsole.label}</span>
                <span className="settings-description">{t.settings.advancedConsole.description}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={advancedConsole}
                  onChange={e => toggleAdvancedConsole(e.target.checked)}
                />
                <div className="toggle-bg"><div className="toggle-knob"></div></div>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={() => setSettingsOpen(false)} className="btn-secondary">{t.settings.close}</button>
        </div>
      </div>
    </div>
  );
}

