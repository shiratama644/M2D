import { describe, it, expect } from 'vitest';
import { classifyDependencies, emptyDepIssues } from '@/lib/dependencyAnalysis';

function baseInput(overrides: Partial<Parameters<typeof classifyDependencies>[0]> = {}) {
  return {
    allDeps: [],
    selectedMods: new Set<string>(),
    sourceNameById: {} as Record<string, string>,
    versionToProjectId: {} as Record<string, string>,
    versionToNumber: {} as Record<string, string>,
    selectedVersionIdByProject: {} as Record<string, string>,
    selectedVersionNumberByProject: {} as Record<string, string>,
    modsWithoutCompatibleVersion: new Set<string>(),
    useLoader: 'fabric',
    useVersion: '1.21.1',
    ...overrides,
  };
}

describe('emptyDepIssues', () => {
  it('returns empty buckets', () => {
    expect(emptyDepIssues()).toEqual({ required: [], optional: [], conflict: [] });
  });
});

describe('classifyDependencies', () => {
  it('reports missing required dependencies', () => {
    const { issues, missingModIds } = classifyDependencies(
      baseInput({
        allDeps: [
          {
            source: 'Sodium',
            sourceId: 'sodium',
            dep: { project_id: 'indium', version_id: null, dependency_type: 'required' },
          },
        ],
        sourceNameById: { sodium: 'Sodium' },
      }),
    );
    expect(issues.required).toEqual([{ source: 'Sodium', targetId: 'indium' }]);
    expect(missingModIds.has('indium')).toBe(true);
  });

  it('reports optional deps when not selected', () => {
    const { issues } = classifyDependencies(
      baseInput({
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: 'opt', version_id: null, dependency_type: 'optional' },
          },
        ],
      }),
    );
    expect(issues.optional[0].targetId).toBe('opt');
  });

  it('reports incompatible selected mods as conflicts', () => {
    const { issues } = classifyDependencies(
      baseInput({
        selectedMods: new Set(['bad']),
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: 'bad', version_id: null, dependency_type: 'incompatible' },
          },
        ],
      }),
    );
    expect(issues.conflict[0].targetId).toBe('bad');
  });

  it('flags selected required deps with no compatible version', () => {
    const { issues } = classifyDependencies(
      baseInput({
        selectedMods: new Set(['dep']),
        modsWithoutCompatibleVersion: new Set(['dep']),
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: 'dep', version_id: null, dependency_type: 'required' },
          },
        ],
      }),
    );
    expect(issues.conflict[0].detail).toMatch(/no compatible version/);
  });

  it('flags version mismatch when required version_id differs', () => {
    const { issues } = classifyDependencies(
      baseInput({
        selectedMods: new Set(['dep']),
        selectedVersionIdByProject: { dep: 'v-selected' },
        selectedVersionNumberByProject: { dep: '2.0.0' },
        versionToNumber: { 'v-required': '1.0.0' },
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: 'dep', version_id: 'v-required', dependency_type: 'required' },
          },
        ],
      }),
    );
    expect(issues.conflict[0].detail).toMatch(/Version mismatch/);
    expect(issues.conflict[0].detail).toContain('1.0.0');
    expect(issues.conflict[0].detail).toContain('2.0.0');
  });

  it('resolves project id from version_id when project_id is missing', () => {
    const { issues } = classifyDependencies(
      baseInput({
        versionToProjectId: { 'ver-1': 'resolved' },
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: null, version_id: 'ver-1', dependency_type: 'required' },
          },
        ],
      }),
    );
    expect(issues.required[0].targetId).toBe('resolved');
  });

  it('skips edges that cannot be resolved to a project', () => {
    const { issues, missingModIds } = classifyDependencies(
      baseInput({
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: null, version_id: 'unknown', dependency_type: 'required' },
          },
        ],
      }),
    );
    expect(issues.required).toHaveLength(0);
    expect(missingModIds.size).toBe(0);
  });

  it('does not flag optional deps that are already selected', () => {
    const { issues } = classifyDependencies(
      baseInput({
        selectedMods: new Set(['opt']),
        allDeps: [
          {
            source: 'A',
            sourceId: 'a',
            dep: { project_id: 'opt', version_id: null, dependency_type: 'optional' },
          },
        ],
      }),
    );
    expect(issues.optional).toHaveLength(0);
    expect(issues.required).toHaveLength(0);
    expect(issues.conflict).toHaveLength(0);
  });
});
