'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import Icon from '@/components/ui/Icon';
import hamburgerIconRaw from '@/assets/icons/hamburger.svg';
import bookmarkIconRaw from '@/assets/icons/bookmark.svg';

export default function Header() {
  const engine = useEngine();
  const { t } = useApp();

  return (
    <header className="header">
      <button
        onClick={() => { void engine.emit('ui.open', { panel: 'menu' }); }}
        className="btn icon-only-btn hamburger-btn"
        aria-label={t.nav.menu}
      >
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <button
        onClick={() => { void engine.emit('ui.open', { panel: 'menu' }); }}
        className="btn icon-only-btn header-profiles-btn"
        aria-label={t.nav.profiles}
      >
        <Icon svg={bookmarkIconRaw} size={24} />
      </button>
    </header>
  );
}
