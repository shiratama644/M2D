'use client';

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { API } from '../lib/api';
import { asyncPool, CONCURRENCY_LIMIT } from '../lib/helpers';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Returns helpers for resolving which loader/version to use for a download,
 * then performing the actual download (zip all selected mods).
 */
export function useModDownload(searchParams) {
  const {
    selectedMods, modDataMap,
    modLoader, modVersion,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    addDebugLog, showAlert, showConfirm,
    t,
  } = useApp();

  // Derive effective loader/version from filter settings
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

  // Prompt user when settings and filter differ; return { proceed, loader, version }
  const resolveDownloadSettings = useCallback(async () => {
    const { effectiveLoader, effectiveVersion } = getEffectiveDownloadSettings();
    const mismatches = [];
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
      const msg =
        `${t.settings.title} / ${t.filters.label} mismatch:\n${mismatches.join('\n')}\n\nDownload using filter settings?`;
      const useFilter = await showConfirm(msg);
      if (useFilter) {
        return { proceed: true, loader: effectiveLoader, version: effectiveVersion };
      }
      return { proceed: false, loader: modLoader, version: modVersion };
    }
    return { proceed: true, loader: modLoader, version: modVersion };
  }, [getEffectiveDownloadSettings, modLoader, modVersion, showConfirm, t]);

  /** Download all selected mods as a zip archive. */
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
    let completed = 0;
    const startTime = Date.now();
    showProgress(ids.length);

    await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
      const modName = modDataMap[pid]?.title || pid;
      try {
        const versions = await API.getVersions(pid, useLoader, useVersion);
        if (versions?.length && versions[0].files?.length) {
          const file = versions[0].files.find((f) => f.primary) || versions[0].files[0];
          const res = await fetch(file.url);
          if (res.ok) {
            zip.file(file.filename, await res.blob());
            success++;
            addDebugLog('log', `Downloaded: ${file.filename}`);
          } else {
            addDebugLog('warn', `HTTP ${res.status} for ${modName} (${file.filename})`);
          }
        } else {
          addDebugLog('warn', `No compatible version found for ${modName}`);
        }
      } catch (e) {
        addDebugLog('error', `Failed to download ${modName}: ${e}`);
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
    } else {
      addDebugLog('error', 'Download failed: no compatible versions found.');
      await showAlert('Download failed. Could not find compatible versions.');
    }
    hideLoading();
  }, [
    selectedMods, modDataMap, resolveDownloadSettings,
    addDebugLog, showLoading, updateLoading, showProgress, updateProgress, hideLoading, showAlert,
  ]);

  return { handleDownload, resolveDownloadSettings };
}
