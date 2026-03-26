'use client';

import { useApp } from '@/context/AppContext';
import MobileModal from '@/components/ui/MobileModal';
import SettingsContent from '@/components/settings/SettingsContent';
import { useGameVersions } from '@/hooks/useGameVersions';
import settingsIconRaw from '@/assets/icons/settings.svg';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, t } = useApp();
  const gameVersions = useGameVersions();

  if (!settingsOpen) return null;

  return (
    <MobileModal
      title={t.settings.title}
      titleIcon={settingsIconRaw}
      onClose={() => setSettingsOpen(false)}
      footer={<button onClick={() => setSettingsOpen(false)} className="btn-secondary">{t.settings.close}</button>}
    >
      <SettingsContent gameVersions={gameVersions} />
    </MobileModal>
  );
}
