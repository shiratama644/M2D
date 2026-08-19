export interface DepIssues {
  required: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
  optional: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
  conflict: Array<{ source: string; targetId: string; detail?: string; reason?: string }>;
}

export interface ResolvedDep {
  source: string;
  sourceId: string;
  dep: { project_id: string | null; version_id: string | null; dependency_type: string };
}

export interface ClassifyDependenciesInput {
  allDeps: ResolvedDep[];
  selectedMods: Set<string>;
  sourceNameById: Record<string, string>;
  versionToProjectId: Record<string, string>;
  versionToNumber: Record<string, string>;
  selectedVersionIdByProject: Record<string, string>;
  selectedVersionNumberByProject: Record<string, string>;
  modsWithoutCompatibleVersion: Set<string>;
  useLoader: string;
  useVersion: string;
}

/**
 * Pure classification of Modrinth dependency edges against the current selection.
 */
export function classifyDependencies(input: ClassifyDependenciesInput): {
  issues: DepIssues;
  missingModIds: Set<string>;
} {
  const issues: DepIssues = { required: [], optional: [], conflict: [] };
  const missingModIds = new Set<string>();

  input.allDeps.forEach(({ source, sourceId, dep }) => {
    const sourceLabel = input.sourceNameById[sourceId] || source;
    const projectId = dep.project_id || input.versionToProjectId[dep.version_id ?? ''];
    if (!projectId) return;

    const isSelected = input.selectedMods.has(projectId);
    if (dep.dependency_type === 'required' && !isSelected) {
      issues.required.push({ source: sourceLabel, targetId: projectId });
      missingModIds.add(projectId);
    } else if (dep.dependency_type === 'required' && isSelected) {
      if (input.modsWithoutCompatibleVersion.has(projectId)) {
        issues.conflict.push({
          source: sourceLabel,
          targetId: projectId,
          detail: `Selected mod has no compatible version for ${input.useLoader} ${input.useVersion}.`,
        });
        missingModIds.add(projectId);
        return;
      }
      if (dep.version_id) {
        const selectedVersionId = input.selectedVersionIdByProject[projectId];
        if (selectedVersionId && selectedVersionId !== dep.version_id) {
          const requiredVersion = input.versionToNumber[dep.version_id] ?? dep.version_id;
          const selectedVersion = input.selectedVersionNumberByProject[projectId] ?? selectedVersionId;
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

  return { issues, missingModIds };
}

export function emptyDepIssues(): DepIssues {
  return { required: [], optional: [], conflict: [] };
}
