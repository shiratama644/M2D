import { Settings2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, theme, toggleTheme, debugMode, toggleDebug } = useApp();

  if (!settingsOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">
            <Settings2 size={20} /> Settings
          </h3>
          <button onClick={() => setSettingsOpen(false)} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>Dark Mode</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toggle dark/light theme</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                className="toggle-input"
                checked={theme === 'dark'}
                onChange={e => toggleTheme(e.target.checked)}
              />
              <div className="toggle-bg"><div className="toggle-knob"></div></div>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', display: 'block' }}>Debug Mode</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show floating developer console</span>
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
          <button onClick={() => setSettingsOpen(false)} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
