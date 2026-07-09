'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { API } from '@/lib/api';
import { asyncPool, CONCURRENCY_LIMIT, type SearchFilters } from '@/lib/helpers';

export type { SearchFilters };

export interface SearchParams {
  query: string;
  sort: string;
  filters: SearchFilters;
}

export interface DepIssues {
  required: Array<{ source: string; targetId: string; detail?: string }>;
  optional: Array<{ source: string; targetId: string; detail?: string }>;
  conflict: Array<{ source: string; targetId: string; detail?: string }>;
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

  const depAbortRef = useRef<AbortController | null>(null);

  // Abort any in-flight dependency check when the hook unmounts.
  useEffect(() => () => { depAbortRef.current?.abort(); }, []);

  const handleCheckDeps = useCallback(async () => {
    if (selectedMods.size === 0) return;

    // Cancel any previous in-flight check.
    depAbortRef.current?.abort();
    const controller = new AbortController();
    depAbortRef.current = controller;
    const { signal } = controller;

    const settings = await resolveSettings();
    if (!settings.proceed || signal.aborted) return;
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
          const versions = await API.getVersions(pid, useLoader, useVersion, signal);
          const selectedVersion = versions?.[0];
          addDebugLog('log', `Fetched versions for ${modName} (${versions?.length ?? 0} found)`);
          return selectedVersion
            ? {
              projectId: pid,
              modName,
              dependencies: selectedVersion.dependencies,
              selectedVersionId: selectedVersion.id,
              selectedVersionNumber: selectedVersion.version_number,
            }
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
      const selectedVersionByProjectId: Record<string, { id: string; versionNumber: string }> = {};

      results.filter((res): res is NonNullable<typeof res> => res !== null).forEach((res) => {
        selectedVersionByProjectId[res.projectId] = {
          id: res.selectedVersionId,
          versionNumber: res.selectedVersionNumber,
        };
        res.dependencies?.forEach((dep) => {
          if (dep.project_id) {
            allDeps.push({ source: res.modName, dep });
          } else if (dep.version_id) {
            allDeps.push({ source: res.modName, dep });
            versionIdsToResolve.add(dep.version_id);
          }
        });
      });

      const versionToProject: Record<string, { projectId: string; versionNumber: string }> = {};
      if (versionIdsToResolve.size > 0) {
        updateLoading('Resolving version IDs...');
        try {
          const vData = await API.getVersionsBulk(Array.from(versionIdsToResolve));
          if (Array.isArray(vData)) {
            vData.forEach((v) => {
              versionToProject[v.id] = {
                projectId: v.project_id,
                versionNumber: v.version_number,
              };
            });
            addDebugLog('log', `Resolved ${vData.length} version IDs to project IDs`);
          }
        } catch (e) {
          addDebugLog('error', `Failed to resolve version IDs: ${e}`);
        }
      }

      allDeps.forEach(({ source, dep }) => {
        const resolvedFromVersion = dep.version_id ? versionToProject[dep.version_id] : undefined;
        const projectId = dep.project_id || resolvedFromVersion?.projectId;
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
        } else if (dep.dependency_type === 'required' && isSelected && dep.version_id) {
          const selectedVersion = selectedVersionByProjectId[projectId];
          if (selectedVersion?.id && selectedVersion.id !== dep.version_id) {
            const requiredVersion = resolvedFromVersion?.versionNumber || dep.version_id;
            const selectedVersionLabel = selectedVersion.versionNumber || selectedVersion.id;
            issues.conflict.push({
              source,
              targetId: projectId,
              detail: `Version mismatch (required: ${requiredVersion}, selected: ${selectedVersionLabel}).`,
            });
          }
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
