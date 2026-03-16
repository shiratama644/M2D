'use client';

import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';
import hamburgerIconRaw from '../../assets/icons/hamburger.svg';

export default function Header() {
  const { setMenuOpen } = useApp();
  return (
    <header className="header">
      <button onClick={() => setMenuOpen(true)} className="icon-btn hamburger-btn">
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <div style={{ width: '2.5rem' }} />
    </header>
  );
}
