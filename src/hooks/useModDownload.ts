'use client';

import { useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { getEngine } from '@/engine/Engine';
import { engineAlert, engineConfirm } from '@/engine/runtime/dialog';
import { asyncPool, CONCURRENCY_LIMIT } from '@/lib/helpers';
import { pickPreferredModVersion } from '@/lib/versionSelection';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { interpolate } from '@/lib/utils';
import type { SearchParams, ResolveSettingsResult } from '@/hooks/useDependencyCheck';

export function useModDownload(searchParams: SearchParams | null) {
  const {
    selectedMods,
    modDataMap,
    modLoader,
    modVersion,
    showLoading,
    updateLoading,
    showProgress,
    updateProgress,
    hideLoading,
    addDebugLog,
    t,
  } = useApp();

  const getEffectiveDownloadSettings = useCallback(() => {
    const filterLoaders = searchParams?.filters?.loaders || {};
    const includedLoaders = Object.entries(filterLoaders)
      .filter(([, v]) => v === 'include')
      .map(([k]) => k);
    const filterVersion = searchParams?.filters?.version || '';

    const effectiveLoader = includedLoaders.length === 1 ? includedLoaders[0] : modLoader;
    const effectiveVersion = filterVersion.trim() || modVersion;

    return { effectiveLoader, effectiveVersion };
  }, [searchParams, modLoader, modVersion]);

  const resolveDownloadSettings = useCallback(async (): Promise<ResolveSettingsResult> => {
    const { effectiveLoader, effectiveVersion } = getEffectiveDownloadSettings();
    const mismatches: string[] = [];
    if (effectiveLoader && modLoader && effectiveLoader !== modLoader) {
      mismatches.push(
        `Loader: ${t.settings.modLoader.label} = ${modLoader}, ${t.filters.label} = ${effectiveLoader}`,
      );
    }
    if (effectiveVersion && modVersion && effectiveVersion !== modVersion) {
      mismatches.push(
        `Version: ${t.settings.modVersion.label} = ${modVersion}, ${t.filters.label} = ${effectiveVersion}`,
      );
    }
    if (mismatches.length > 0) {
      const msg = `${mismatches.join('\n')}\n\n${t.download.mismatchConfirm}`;
      const useFilter = await engineConfirm(msg);
      if (useFilter) {
        return { proceed: true, loader: effectiveLoader, version: effectiveVersion };
      }
      return { proceed: false, loader: modLoader, version: modVersion };
    }
    return { proceed: true, loader: modLoader, version: modVersion };
  }, [getEffectiveDownloadSettings, modLoader, modVersion, t]);

  const handleDownload = useCallback(async () => {
    if (selectedMods.size === 0) return;

    const settings = await resolveDownloadSettings();
    if (!settings.proceed) return;
    const { loader: useLoader, version: useVersion } = settings;

    addDebugLog('info', `Starting download for ${selectedMods.size} mods (${useLoader} ${useVersion})...`);
    showLoading('Preparing Download...');

    const zip = new JSZip();
    const ids = Array.from(selectedMods);
    let success = 0;
    const failed: string[] = [];
    let completed = 0;
    const startTime = Date.now();
    showProgress(ids.length);

    await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
      const mod = modDataMap[pid] as { title?: string } | undefined;
      const modName = mod?.title || pid;
      try {
        const versions = await getEngine().dispatch('catalog.versions', {
          id: pid,
          loader: useLoader,
          version: useVersion,
        }) ?? [];
        const selectedVersion = pickPreferredModVersion(versions);
        if (selectedVersion?.files?.length) {
          if (selectedVersion.version_type && selectedVersion.version_type !== 'release') {
            addDebugLog(
              'warn',
              `Using ${selectedVersion.version_type} version for ${modName} (no release version found)`,
            );
          }
          const file = selectedVersion.files.find((f) => f.primary) || selectedVersion.files[0];
          const res = await fetch(file.url, { signal: AbortSignal.timeout(30_000) });
          if (res.ok) {
            zip.file(file.filename, await res.blob());
            success++;
            addDebugLog('log', `Downloaded: ${file.filename}`);
          } else {
            addDebugLog('warn', `HTTP ${res.status} for ${modName} (${file.filename})`);
            failed.push(modName);
          }
        } else {
          addDebugLog('warn', `No compatible version found for ${modName}`);
          failed.push(modName);
        }
      } catch (e) {
        addDebugLog('error', `Failed to download ${modName}: ${e}`);
        failed.push(modName);
      } finally {
        completed++;
        updateProgress(completed, ids.length, startTime);
        updateLoading(`Downloading... (${Math.round((completed / ids.length) * 100)}%)`);
      }
    });

    if (success > 0) {
      addDebugLog('info', `Compressing ZIP (${success}/${ids.length} mods)...`);
      updateLoading('Compressing ZIP...');
      showProgress();
      const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
        updateLoading(`Compressing ZIP... ${Math.round(meta.percent)}%`);
      });
      const filename = `mods-${useLoader}-${useVersion}-${Date.now()}.zip`;
      saveAs(content, filename);
      addDebugLog('info', `Download complete: ${filename}`);
      hideLoading();
      if (failed.length > 0) {
        await engineAlert(interpolate(t.download.partial, {
          ok: success,
          total: ids.length,
          file: filename,
          list: failed.join(', '),
        }));
      } else {
        await engineAlert(interpolate(t.download.savedZip, { file: filename }));
      }
    } else {
      addDebugLog('error', 'Download failed: no compatible versions found.');
      hideLoading();
      await engineAlert(t.download.failed);
    }
  }, [
    selectedMods, modDataMap, resolveDownloadSettings, t,
    addDebugLog, showLoading, updateLoading, showProgress, updateProgress, hideLoading,
  ]);

  return { handleDownload, resolveDownloadSettings };
}
