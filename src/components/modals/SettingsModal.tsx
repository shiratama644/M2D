'use client';

import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import MobileModal from '@/components/ui/MobileModal';
import SettingsContent from '@/components/settings/SettingsContent';
import { useGameVersions } from '@/hooks/useGameVersions';
import settingsIconRaw from '@/assets/icons/settings.svg';

export default function SettingsModal() {
  const { settingsOpen, t } = useApp();
  const engine = useEngine();
  const gameVersions = useGameVersions();
  const close = () => { void engine.emit('ui.close', { panel: 'settings' }); };

  if (!settingsOpen) return null;

  return (
    <MobileModal
      title={t.settings.title}
      titleIcon={settingsIconRaw}
      onClose={close}
      footer={<button onClick={close} className="btn-secondary">{t.settings.close}</button>}
    >
      <SettingsContent gameVersions={gameVersions} />
    </MobileModal>
  );
}
