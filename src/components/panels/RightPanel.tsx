'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ModDetail from '@/components/mods/ModDetail';
import SettingsContent from '@/components/settings/SettingsContent';
import DebugPanel from '@/components/debug/DebugPanel';
import HistoryTab from '@/components/panels/HistoryTab';
import SelectedTab from '@/components/panels/SelectedTab';
import FavoritesTab from '@/components/panels/FavoritesTab';
import { useGameVersions } from '@/hooks/useGameVersions';
import Icon from '@/components/ui/Icon';
import type { SearchContextEntry } from '@/store/useAppStore';

import fileTextIconRaw from '@/assets/icons/file-text.svg';
import historyIconRaw from '@/assets/icons/history.svg';
import settingsIconRaw from '@/assets/icons/settings.svg';
import checkCircleIconRaw from '@/assets/icons/check-circle.svg';
import starIconRaw from '@/assets/icons/star.svg';
import terminalIconRaw from '@/assets/icons/terminal-square.svg';

type Tab = 'description' | 'history' | 'settings' | 'selected' | 'favorites' | 'console';

interface RightPanelProps {
  onContextRestore: (entry: SearchContextEntry) => void;
}

export default function RightPanel({ onContextRestore }: RightPanelProps) {
  const { debugMode, t } = useApp();
  const gameVersions = useGameVersions();
  const [tab, setTab] = useState<Tab>('description');

  const tabs: Array<{ id: Tab; icon: string; label: string }> = [
    { id: 'description', icon: fileTextIconRaw,    label: t.rightPanel.description },
    { id: 'history',     icon: historyIconRaw,     label: t.rightPanel.history },
    { id: 'settings',    icon: settingsIconRaw,    label: t.rightPanel.settings },
    { id: 'selected',    icon: checkCircleIconRaw, label: t.rightPanel.selected },
    { id: 'favorites',   icon: starIconRaw,        label: t.rightPanel.favorites },
    ...(debugMode ? [{ id: 'console' as Tab, icon: terminalIconRaw, label: t.rightPanel.console }] : []),
  ];

  return (
    <div className="right-panel">
      <div className="rp-tabs">
        {tabs.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`rp-tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            title={label}
          >
            <Icon svg={icon} size={16} />
            <span className="rp-tab-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="rp-panel-body">
        {tab === 'description' && <ModDetail />}
        {tab === 'history'     && <HistoryTab onContextRestore={onContextRestore} />}
        {tab === 'settings'    && <SettingsContent gameVersions={gameVersions} />}
        {tab === 'selected'    && <SelectedTab />}
        {tab === 'favorites'   && <FavoritesTab />}
        {tab === 'console' && debugMode && <DebugPanel />}
      </div>
    </div>
  );
}
