import { Settings2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CustomSelect from './CustomSelect';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, theme, toggleTheme, debugMode, toggleDebug, fastSearch, toggleFastSearch, language, toggleLanguage, t } = useApp();

  if (!settingsOpen) return null;

  const themeOptions = [
    { value: 'light', label: t.themes.light },
    { value: 'dark', label: t.themes.dark },
  ];

  const languageOptions = [
    { value: 'en', label: t.languages.en },
    { value: 'ja', label: t.languages.ja },
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>{t.settings.theme.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.settings.theme.description}</span>
            </div>
            <CustomSelect
              className="settings-select"
              options={themeOptions}
              value={theme}
              onChange={toggleTheme}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>{t.settings.language.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.settings.language.description}</span>
            </div>
            <CustomSelect
              className="settings-select"
              options={languageOptions}
              value={language}
              onChange={toggleLanguage}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>{t.settings.fastSearch.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.settings.fastSearch.description}</span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>{t.settings.debugMode.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.settings.debugMode.description}</span>
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
        <div className="modal-footer">
          <button onClick={() => setSettingsOpen(false)} className="btn-secondary">{t.settings.close}</button>
        </div>
      </div>
    </div>
  );
}
