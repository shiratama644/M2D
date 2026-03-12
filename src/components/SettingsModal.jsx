import { Settings2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';
import { LOADER_OPTIONS, LOADER_ICON_PATHS } from '../utils/helpers';

export default function SettingsModal() {
  const {
    settingsOpen, setSettingsOpen,
    theme, toggleTheme,
    debugMode, toggleDebug,
    fastSearch, toggleFastSearch,
    language, toggleLanguage,
    modLoader, updateModLoader,
    modVersion, updateModVersion,
    t,
  } = useApp();

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
        ? <img src={LOADER_ICON_PATHS[o.value]} alt={o.label} className="loader-icon-img" />
        : undefined,
    })),
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">
            <Settings2 size={20} /> {t.settings.title}
          </h3>
          <button onClick={() => setSettingsOpen(false)} className="btn-close-modal">
            <X size={20} />
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
              <input
                type="text"
                value={modVersion}
                onChange={e => updateModVersion(e.target.value)}
                placeholder="ex: 1.21.1"
                className="input-large settings-version-input"
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
            <div className="settings-row" style={{ marginBottom: 0 }}>
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
          </div>

          {/* Developer Mode Category */}
          <div className="settings-category" style={{ marginBottom: 0 }}>
            <h4 className="settings-category-title">{t.settings.categories.developerMode}</h4>
            <div className="settings-row" style={{ marginBottom: 0 }}>
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
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={() => setSettingsOpen(false)} className="btn-secondary">{t.settings.close}</button>
        </div>
      </div>
    </div>
  );
}
