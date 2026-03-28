'use client';

import { useState, useEffect, useRef } from 'react';
import { API } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { GameVersion } from '@/types/modrinth';

/**
 * Fetches the list of released Minecraft game versions from the Modrinth API.
 * Returns an array of version objects (same shape as Modrinth's /tag/game_version).
 * Logs a warning via addDebugLog on failure.
 */
export function useGameVersions(): GameVersion[] {
  const { addDebugLog } = useApp();
  const addDebugLogRef = useRef(addDebugLog);
  addDebugLogRef.current = addDebugLog;
  const [gameVersions, setGameVersions] = useState<GameVersion[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    API.getGameVersions(controller.signal)
      .then((versions) => {
        if (!controller.signal.aborted) {
          setGameVersions(versions.filter((v) => v.version_type === 'release'));
        }
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name !== 'AbortError') {
          addDebugLogRef.current('warn', `Failed to load game versions: ${e}`);
        }
      });
    return () => controller.abort();
  // Run once on mount; addDebugLog is accessed via ref to avoid spurious refetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return gameVersions;
}
