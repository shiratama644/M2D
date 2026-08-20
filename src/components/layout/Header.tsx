'use client';

import { useEngine } from '@/engine/react/EngineProvider';
import Icon from '@/components/ui/Icon';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import hamburgerIconRaw from '@/assets/icons/hamburger.svg';
import settingsIconRaw from '@/assets/icons/settings.svg';
import userIconRaw from '@/assets/icons/user.svg';
import historyIconRaw from '@/assets/icons/history.svg';
import starIconRaw from '@/assets/icons/star.svg';
import checkCircleIconRaw from '@/assets/icons/check-circle.svg';

export default function Header() {
  const engine = useEngine();
  const { data: session } = useSession();

  return (
    <header className="header">
      <button onClick={() => { void engine.emit('ui.open', { panel: 'menu' }); }} className="btn icon-only-btn hamburger-btn">
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'history' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label="History"
        >
          <Icon svg={historyIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'favorites' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label="Favorites"
        >
          <Icon svg={starIconRaw} size={24} />
        </button>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'selected' }); }}
          className="btn icon-only-btn mobile-only-btn"
          aria-label="Selected Mods"
        >
          <Icon svg={checkCircleIconRaw} size={24} />
        </button>
        <Link href="/account" className="btn icon-only-btn" aria-label="Account">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'avatar'}
              width={28}
              height={28}
              style={{ borderRadius: '50%', display: 'block' }}
            />
          ) : (
            <Icon svg={userIconRaw} size={24} />
          )}
        </Link>
        <button
          onClick={() => { void engine.emit('ui.open', { panel: 'settings' }); }}
          className="btn icon-only-btn header-settings-btn"
          aria-label="Settings"
        >
          <Icon svg={settingsIconRaw} size={24} />
        </button>
      </div>
    </header>
  );
}
