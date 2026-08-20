'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import Icon from '@/components/ui/Icon';
import hamburgerIconRaw from '@/assets/icons/hamburger.svg';
import bookmarkIconRaw from '@/assets/icons/bookmark.svg';
import settingsIconRaw from '@/assets/icons/settings.svg';
import historyIconRaw from '@/assets/icons/history.svg';
import starIconRaw from '@/assets/icons/star.svg';
import checkCircleIconRaw from '@/assets/icons/check-circle.svg';

export default function Header() {
  const engine = useEngine();
  const { t } = useApp();

  return (
    <header className="header">
      <button
        onClick={() => { void engine.emit('ui.open', { panel: 'menu' }); }}
        className="btn icon-only-btn hamburger-btn"
        aria-label={t.nav.profiles}
      >
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'history' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label={t.nav.history}
        >
          <Icon svg={historyIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'favorites' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label={t.nav.favorites}
        >
          <Icon svg={starIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'selected' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label={t.nav.selected}
        >
          <Icon svg={checkCircleIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'menu' }); }}
          className="btn icon-only-btn header-profiles-btn"
          aria-label={t.nav.profiles}
        >
          <Icon svg={bookmarkIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'settings' }); }}
          className="btn icon-only-btn header-settings-btn"
          aria-label={t.nav.settings}
        >
          <Icon svg={settingsIconRaw} size={24} />
        </button>
      </div>
    </header>
  );
}
