'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import { getEngine } from '@/engine/Engine';
import CustomSelect from '@/components/ui/CustomSelect';
import type { ModVersion } from '@/types/modrinth';

interface VersionPickerProps {
  projectId: string;
}

export default function VersionPicker({ projectId }: VersionPickerProps) {
  const { modLoader, modVersion, pinnedVersions, t } = useApp();
  const engine = useEngine();
  const [versions, setVersions] = useState<ModVersion[]>([]);
  const pinned = pinnedVersions[projectId] ?? '';

  useEffect(() => {
    const controller = new AbortController();
    getEngine()
      .dispatch('catalog.versions', {
        id: projectId,
        loader: modLoader,
        version: modVersion,
        signal: controller.signal,
      })
      .then((list) => {
        if (list) setVersions(list);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [projectId, modLoader, modVersion]);

  if (versions.length === 0) return null;

  const selected = versions.find((v) => v.id === pinned) ?? versions.find((v) => v.version_type === 'release') ?? versions[0];

  return (
    <div className="version-picker">
      <label className="version-picker-label">{t.versions.label}</label>
      <CustomSelect
        aria-label={t.versions.label}
        options={versions.map((v) => ({
          value: v.id,
          label: `${v.version_number}${v.version_type && v.version_type !== 'release' ? ` (${v.version_type})` : ''}`,
        }))}
        value={selected.id}
        onChange={(value) => { void engine.emit('mods.pinVersion', { id: projectId, versionId: value }); }}
      />
      {selected.changelog ? (
        <details className="version-changelog">
          <summary>{t.versions.changelog}</summary>
          <pre>{selected.changelog}</pre>
        </details>
      ) : null}
    </div>
  );
}
