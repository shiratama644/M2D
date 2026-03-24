'use client';

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { API } from '../lib/api';
import { asyncPool, CONCURRENCY_LIMIT, type SearchFilters } from '../lib/helpers';

export type { SearchFilters };

export interface SearchParams {
  query: string;
  sort: string;
  filters: SearchFilters;
}

export interface DepIssues {
  required: Array<{ source: string; targetId: string }>;
  optional: Array<{ source: string; targetId: string }>;
  conflict: Array<{ source: string; targetId: string }>;
}

export interface ResolveSettingsResult {
  proceed: boolean;
  loader: string;
  version: string;
}

/**
 * Returns a `handleCheckDeps` function that analyses all selected mods for
 * missing required/optional dependencies and incompatibilities, then opens
 * the DependencyModal with the results.
 */
export function useDependencyCheck(
  searchParams: SearchParams | null,
  resolveSettings: () => Promise<ResolveSettingsResult>,
  onResult: (issues: DepIssues) => void,
) {
  const {
    selectedMods,
    modDataMap,
    updateModDataMap,
    showLoading,
    updateLoading,
    showProgress,
    updateProgress,
    hideLoading,
    addDebugLog,
    showAlert,
    setDepModalOpen,
  } = useApp();

  const handleCheckDeps = useCallback(async () => {
    if (selectedMods.size === 0) return;

    const settings = await resolveSettings();
    if (!settings.proceed) return;
    const { loader: useLoader, version: useVersion } = settings;

    addDebugLog('info', `Checking dependencies for ${selectedMods.size} mods...`);
    showLoading('Analyzing Dependencies...');

    const issues: DepIssues = { required: [], optional: [], conflict: [] };
    const missingModIds = new Set<string>();

    try {
      const ids = Array.from(selectedMods);
      let completed = 0;
      const startTime = Date.now();
      showProgress(ids.length);

      const results = await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
        const mod = modDataMap[pid] as { title?: string } | undefined;
        const modName = mod?.title || pid;
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

      const allDeps: Array<{
        source: string;
        dep: { project_id: string | null; version_id: string | null; dependency_type: string };
      }> = [];
      const versionIdsToResolve = new Set<string>();

      results.filter(Boolean).forEach((res) => {
        if (!res) return;
        res.dependencies?.forEach((dep) => {
          if (dep.project_id) {
            allDeps.push({ source: res.modName, dep });
          } else if (dep.version_id) {
            allDeps.push({ source: res.modName, dep });
            versionIdsToResolve.add(dep.version_id);
          }
        });
      });

      const versionToProjectId: Record<string, string> = {};
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

      allDeps.forEach(({ source, dep }) => {
        const projectId = dep.project_id || versionToProjectId[dep.version_id ?? ''];
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

      if (missingModIds.size > 0) {
        updateLoading('Resolving names...');
        const idsToFetch = Array.from(missingModIds).filter((id) => !modDataMap[id]);
        if (idsToFetch.length > 0) {
          addDebugLog('log', `Resolving ${idsToFetch.length} unknown mod names...`);
          const pData = await API.getProjects(idsToFetch);
          const map: Record<string, unknown> = {};
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
