'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { API } from '@/lib/api';
import { asyncPool, CONCURRENCY_LIMIT, type SearchFilters } from '@/lib/helpers';
import { pickPreferredModVersion } from '@/lib/versionSelection';

export type { SearchFilters };

export interface SearchParams {
  query: string;
  sort: string;
  filters: SearchFilters;
}

export interface DepIssues {
  required: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
  optional: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
  conflict: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
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
    const modsWithoutCompatibleVersion = new Set<string>();

    try {
      const ids = Array.from(selectedMods);
      const sourceNameById: Record<string, string> = {};
      ids.forEach((id) => {
        const mod = modDataMap[id] as { title?: string } | undefined;
        if (mod?.title) sourceNameById[id] = mod.title;
      });
      const sourceIdsToFetch = ids.filter((id) => !sourceNameById[id]);
      if (sourceIdsToFetch.length > 0) {
        updateLoading('Resolving source names...');
        try {
          const sourceProjects = await API.getProjects(sourceIdsToFetch, signal);
          const map: Record<string, unknown> = {};
          sourceProjects.forEach((project) => {
            sourceNameById[project.id] = project.title;
            map[project.id] = project;
          });
          if (Object.keys(map).length > 0) updateModDataMap(map);
        } catch (e) {
          addDebugLog('warn', `Failed to resolve source names: ${e}`);
        }
      }
      let completed = 0;
      const startTime = Date.now();
      showProgress(ids.length);

      const results = await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
        const mod = modDataMap[pid] as { title?: string } | undefined;
        const modName = mod?.title || pid;
        try {
          const versions = await API.getVersions(pid, useLoader, useVersion, signal);
          addDebugLog('log', `Fetched versions for ${modName} (${versions?.length ?? 0} found)`);
          const selectedVersion = pickPreferredModVersion(versions);
          if (!selectedVersion) {
            modsWithoutCompatibleVersion.add(pid);
            addDebugLog('warn', `No compatible version found for ${modName} (${useLoader} ${useVersion})`);
            return null;
          }
          if (selectedVersion.version_type && selectedVersion.version_type !== 'release') {
            addDebugLog(
              'warn',
              `Dependency check for ${modName} uses ${selectedVersion.version_type} version (no release found)`,
            );
          }
          return {
            projectId: pid,
            modName,
            selectedVersionId: selectedVersion.id,
            selectedVersionNumber: selectedVersion.version_number,
            dependencies: selectedVersion.dependencies,
          };
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
        sourceId: string;
        dep: { project_id: string | null; version_id: string | null; dependency_type: string };
      }> = [];
      const versionIdsToResolve = new Set<string>();
      const selectedVersionIdByProject: Record<string, string> = {};
      const selectedVersionNumberByProject: Record<string, string> = {};

      results.filter((res): res is NonNullable<typeof res> => res !== null).forEach((res) => {
        selectedVersionIdByProject[res.projectId] = res.selectedVersionId;
        selectedVersionNumberByProject[res.projectId] = res.selectedVersionNumber;
        res.dependencies?.forEach((dep) => {
          if (dep.project_id) {
            allDeps.push({ source: sourceNameById[res.projectId] || res.modName, sourceId: res.projectId, dep });
          } else if (dep.version_id) {
            allDeps.push({ source: sourceNameById[res.projectId] || res.modName, sourceId: res.projectId, dep });
            versionIdsToResolve.add(dep.version_id);
          }
        });
      });

      const versionToProjectId: Record<string, string> = {};
      const versionToNumber: Record<string, string> = {};
      if (versionIdsToResolve.size > 0) {
        updateLoading('Resolving version IDs...');
        try {
          const vData = await API.getVersionsBulk(Array.from(versionIdsToResolve));
          if (Array.isArray(vData)) {
            vData.forEach((v) => {
              versionToProjectId[v.id] = v.project_id;
              versionToNumber[v.id] = v.version_number;
            });
            addDebugLog('log', `Resolved ${vData.length} version IDs to project IDs`);
          }
        } catch (e) {
          addDebugLog('error', `Failed to resolve version IDs: ${e}`);
        }
      }

      allDeps.forEach(({ source, sourceId, dep }) => {
        const sourceLabel = sourceNameById[sourceId] || source;
        const projectId = dep.project_id || versionToProjectId[dep.version_id ?? ''];
        if (!projectId) {
          if (dep.version_id) {
            addDebugLog('warn', `Could not resolve project ID for version ${dep.version_id} (source: ${sourceLabel})`);
          }
          return;
        }
        const isSelected = selectedMods.has(projectId);
        if (dep.dependency_type === 'required' && !isSelected) {
          issues.required.push({ source: sourceLabel, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'required' && isSelected) {
          if (modsWithoutCompatibleVersion.has(projectId)) {
            issues.conflict.push({
              source: sourceLabel,
              targetId: projectId,
              detail: `Selected mod has no compatible version for ${useLoader} ${useVersion}.`,
            });
            missingModIds.add(projectId);
            return;
          }
          if (dep.version_id) {
            const selectedVersionId = selectedVersionIdByProject[projectId];
            if (selectedVersionId && selectedVersionId !== dep.version_id) {
              const requiredVersion = versionToNumber[dep.version_id] ?? dep.version_id;
              const selectedVersion = selectedVersionNumberByProject[projectId] ?? selectedVersionId;
              issues.conflict.push({
                source: sourceLabel,
                targetId: projectId,
                detail: `Version mismatch (required: ${requiredVersion}, selected: ${selectedVersion}).`,
              });
              missingModIds.add(projectId);
            }
          }
        } else if (dep.dependency_type === 'optional' && !isSelected) {
          issues.optional.push({ source: sourceLabel, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'incompatible' && isSelected) {
          issues.conflict.push({ source: sourceLabel, targetId: projectId });
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
