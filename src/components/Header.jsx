import { useApp } from '../context/AppContext';
import Icon from './Icon';
import hamburgerIconRaw from '../assets/icons/hamburger.svg?raw';
import settingsIconRaw from '../assets/icons/settings.svg?raw';

export default function Header() {
  const { setMenuOpen, setSettingsOpen } = useApp();
  return (
    <header className="header">
      <button onClick={() => setMenuOpen(true)} className="icon-btn hamburger-btn">
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <button onClick={() => setSettingsOpen(true)} className="icon-btn">
        <Icon svg={settingsIconRaw} size={24} />
      </button>
    </header>
  );
}
