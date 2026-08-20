'use client';

import { useState } from 'react';
import type { Session } from 'next-auth';
import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import discordIconRaw from '@/assets/icons/discord.svg';
import userIconRaw from '@/assets/icons/user.svg';

interface Props {
  session: Session | null;
}

export default function AccountClient({ session }: Props) {
  const user = session?.user;
  const [avatarError, setAvatarError] = useState(false);
  const engine = useEngine();
  const { t } = useApp();

  return (
    <div className="account-page-wrapper">
      <div className="account-card">
        <div className="account-header">
          <Link href="/" className="btn-text-icon" style={{ alignSelf: 'flex-start' }}>
            ← {t.account.back}
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>{t.account.title}</h1>
        </div>

        {user ? (
          <div className="account-profile">
            {user.image && !avatarError ? (
              <Image
                src={user.image}
                alt={user.name ?? 'avatar'}
                width={80}
                height={80}
                className="account-avatar"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="account-avatar account-avatar-fallback">
                <Icon svg={userIconRaw as string} size={48} />
              </div>
            )}
            <div className="account-info">
              <div className="account-name">{user.name}</div>
              {user.email && (
                <div className="account-email">{user.email}</div>
              )}
              <div className="account-provider-badge">
                <Icon svg={discordIconRaw as string} size={16} />
                Discord
              </div>
            </div>

            <div className="account-section">
              <h2>{t.account.linked}</h2>
              <div className="account-linked-row">
                <Icon svg={discordIconRaw as string} size={18} />
                <span>Discord</span>
                <span className="account-linked-status connected">{t.account.connected}</span>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => { void engine.emit('auth.signOut', undefined); }}
              className="account-signout-btn w-full"
            >
              {t.account.signOut}
            </Button>
          </div>
        ) : (
          <div className="account-signin">
            <p className="account-signin-desc">
              {t.account.signInDesc}
            </p>
            <Button
              variant="discord"
              onClick={() => { void engine.emit('auth.signIn', undefined); }}
            >
              <Icon svg={discordIconRaw as string} size={20} />
              Sign in with Discord
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
