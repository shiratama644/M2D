import { Menu, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { setMenuOpen, setSettingsOpen } = useApp();
  return (
    <header className="header">
      <button onClick={() => setMenuOpen(true)} className="icon-btn">
        <Menu size={24} />
      </button>
      <h1>Mod Manager</h1>
      <button onClick={() => setSettingsOpen(true)} className="icon-btn">
        <Settings size={24} />
      </button>
    </header>
  );
}
