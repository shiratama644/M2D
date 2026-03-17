'use client';

import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';
import hamburgerIconRaw from '../../assets/icons/hamburger.svg';
import settingsIconRaw from '../../assets/icons/settings.svg';

export default function Header() {
  const { setMenuOpen, setSettingsOpen } = useApp();
  return (
    <header className="header">
      <button onClick={() => setMenuOpen(true)} className="icon-btn hamburger-btn">
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      {/* Settings button: visible only on mobile (hidden via CSS on PC) */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="icon-btn header-settings-btn"
        aria-label="Settings"
      >
        <Icon svg={settingsIconRaw} size={24} />
      </button>
    </header>
  );
}
