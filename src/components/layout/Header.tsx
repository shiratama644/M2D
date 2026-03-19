'use client';

import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import hamburgerIconRaw from '../../assets/icons/hamburger.svg';
import settingsIconRaw from '../../assets/icons/settings.svg';
import userIconRaw from '../../assets/icons/user.svg';

export default function Header() {
  const { setMenuOpen, setSettingsOpen } = useApp();
  const { data: session } = useSession();

  return (
    <header className="header">
      <button onClick={() => setMenuOpen(true)} className="btn icon-only-btn hamburger-btn">
        <Icon svg={hamburgerIconRaw} size={24} />
      </button>
      <h1>Mod Manager</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
          onClick={() => setSettingsOpen(true)}
          className="btn icon-only-btn header-settings-btn"
          aria-label="Settings"
        >
          <Icon svg={settingsIconRaw} size={24} />
        </button>
      </div>
    </header>
  );
}
