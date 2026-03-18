'use client';

import { useState, useEffect } from 'react';
import { API } from '../lib/api';
import { useApp } from '../context/AppContext';

/**
 * Fetches the list of released Minecraft game versions from the Modrinth API.
 * Returns an array of version objects (same shape as Modrinth's /tag/game_version).
 * Logs a warning via addDebugLog on failure.
 */
export function useGameVersions() {
  const { addDebugLog } = useApp();
  const [gameVersions, setGameVersions] = useState([]);

  useEffect(() => {
    API.getGameVersions()
      .then((versions) => {
        const releases = versions.filter((v) => v.version_type === 'release');
        setGameVersions(releases);
      })
      .catch((e) => addDebugLog('warn', `Failed to load game versions: ${e}`));
  }, [addDebugLog]);

  return gameVersions;
}
