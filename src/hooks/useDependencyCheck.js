'use client';

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { API } from '../lib/api';
import { asyncPool, CONCURRENCY_LIMIT } from '../lib/helpers';

/**
 * Returns a `handleCheckDeps` function that analyses all selected mods for
 * missing required/optional dependencies and incompatibilities, then opens
 * the DependencyModal with the results.
 *
 * @param {object} searchParams      - Current search/filter state (for loader/version resolution)
 * @param {Function} resolveSettings - resolveDownloadSettings from useModDownload
 * @param {Function} onResult        - Called with (issues) when analysis completes
 */
export function useDependencyCheck(searchParams, resolveSettings, onResult) {
  const {
    selectedMods, modDataMap, updateModDataMap,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    addDebugLog, showAlert,
    setDepModalOpen,
  } = useApp();

  const handleCheckDeps = useCallback(async () => {
    if (selectedMods.size === 0) return;

    const settings = await resolveSettings();
    if (!settings.proceed) return;
    const { loader: useLoader, version: useVersion } = settings;

    addDebugLog('info', `Checking dependencies for ${selectedMods.size} mods...`);
    showLoading('Analyzing Dependencies...');

    const issues = { required: [], optional: [], conflict: [] };
    const missingModIds = new Set();

    try {
      const ids = Array.from(selectedMods);
      let completed = 0;
      const startTime = Date.now();
      showProgress(ids.length);

      const results = await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
        const modName = modDataMap[pid]?.title || pid;
        try {
          const versions = await API.getVersions(pid, useLoader, useVersion);
          addDebugLog('log', `Fetched versions for ${modName} (${versions?.length ?? 0} found)`);
          return versions?.length
            ? { modName, dependencies: versions[0].dependencies }
            : null;
        } catch (e) {
          addDebugLog('error', `Failed to fetch versions for ${modName}: ${e}`);
          return null;
        } finally {
          completed++;
          updateProgress(completed, ids.length, startTime);
        }
      });

      // Collect all dependency edges; track version_ids that need resolution
      const allDeps = [];
      const versionIdsToResolve = new Set();

      results.filter(Boolean).forEach((res) => {
        res.dependencies?.forEach((dep) => {
          if (dep.project_id) {
            allDeps.push({ source: res.modName, dep });
          } else if (dep.version_id) {
            allDeps.push({ source: res.modName, dep });
            versionIdsToResolve.add(dep.version_id);
          }
        });
      });

      // Resolve version_id → project_id
      const versionToProjectId = {};
      if (versionIdsToResolve.size > 0) {
        updateLoading('Resolving version IDs...');
        try {
          const vData = await API.getVersionsBulk(Array.from(versionIdsToResolve));
          if (Array.isArray(vData)) {
            vData.forEach((v) => { versionToProjectId[v.id] = v.project_id; });
            addDebugLog('log', `Resolved ${vData.length} version IDs to project IDs`);
          }
        } catch (e) {
          addDebugLog('error', `Failed to resolve version IDs: ${e}`);
        }
      }

      // Classify dependencies
      allDeps.forEach(({ source, dep }) => {
        const projectId = dep.project_id || versionToProjectId[dep.version_id];
        if (!projectId) {
          if (dep.version_id) {
            addDebugLog('warn', `Could not resolve project ID for version ${dep.version_id} (source: ${source})`);
          }
          return;
        }
        const isSelected = selectedMods.has(projectId);
        if (dep.dependency_type === 'required' && !isSelected) {
          issues.required.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'optional' && !isSelected) {
          issues.optional.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'incompatible' && isSelected) {
          issues.conflict.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        }
      });

      addDebugLog(
        'info',
        `Dependency check done: required=${issues.required.length}, optional=${issues.optional.length}, conflicts=${issues.conflict.length}`,
      );

      // Fetch names for any mods we haven't seen yet
      if (missingModIds.size > 0) {
        updateLoading('Resolving names...');
        const idsToFetch = Array.from(missingModIds).filter((id) => !modDataMap[id]);
        if (idsToFetch.length > 0) {
          addDebugLog('log', `Resolving ${idsToFetch.length} unknown mod names...`);
          const pData = await API.getProjects(idsToFetch);
          const map = {};
          pData.forEach((p) => { map[p.id] = p; });
          updateModDataMap(map);
        }
      }

      hideLoading();
      onResult(issues);
      setDepModalOpen(true);
    } catch (e) {
      hideLoading();
      addDebugLog('error', `Dependency check failed: ${e}`);
      await showAlert('Error checking dependencies.');
    }
  }, [
    selectedMods, modDataMap, updateModDataMap, resolveSettings, onResult,
    addDebugLog, showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    showAlert, setDepModalOpen,
  ]);

  return { handleCheckDeps };
}
