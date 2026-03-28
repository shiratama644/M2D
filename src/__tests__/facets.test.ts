import { describe, it, expect } from 'vitest';
import { buildFacets } from '@/lib/facets';

describe('buildFacets', () => {
  // ── Base facet ─────────────────────────────────────────────────────────────

  it('returns only the project_type facet when filters are null', () => {
    expect(buildFacets(null, 'mod')).toEqual([['project_type:mod']]);
  });

  it('returns only the project_type facet when filters are undefined', () => {
    expect(buildFacets(undefined, 'mod')).toEqual([['project_type:mod']]);
  });

  it('returns only the project_type facet when loaders are all null', () => {
    expect(buildFacets({ loaders: { fabric: null, forge: null } }, 'mod')).toEqual([['project_type:mod']]);
  });

  it('uses the supplied project type', () => {
    expect(buildFacets(null, 'shader')).toEqual([['project_type:shader']]);
  });

  it('uses the modpack project type', () => {
    expect(buildFacets(null, 'modpack')).toEqual([['project_type:modpack']]);
  });

  // ── Loader facets ──────────────────────────────────────────────────────────

  it('includes a single loader in its own facet group', () => {
    const result = buildFacets({ loaders: { fabric: 'include', forge: null } }, 'mod');
    expect(result).toContainEqual(['loaders:fabric']);
  });

  it('groups multiple "include" loaders into the same facet group', () => {
    const result = buildFacets({ loaders: { fabric: 'include', quilt: 'include' } }, 'mod');
    expect(result).toContainEqual(['loaders:fabric', 'loaders:quilt']);
  });

  it('adds a NOT facet for an excluded loader', () => {
    const result = buildFacets({ loaders: { forge: 'exclude' } }, 'mod');
    expect(result).toContainEqual(['NOT loaders:forge']);
  });

  it('handles include + exclude loaders simultaneously', () => {
    const result = buildFacets({ loaders: { fabric: 'include', forge: 'exclude' } }, 'mod');
    expect(result).toContainEqual(['loaders:fabric']);
    expect(result).toContainEqual(['NOT loaders:forge']);
  });

  // ── Category facets ────────────────────────────────────────────────────────

  it('includes a single category in its own facet group', () => {
    const result = buildFacets({ loaders: {}, categories: { optimization: 'include' } }, 'mod');
    expect(result).toContainEqual(['categories:optimization']);
  });

  it('groups multiple "include" categories into the same facet group', () => {
    const result = buildFacets({ loaders: {}, categories: { optimization: 'include', technology: 'include' } }, 'mod');
    expect(result).toContainEqual(['categories:optimization', 'categories:technology']);
  });

  it('adds a NOT facet for an excluded category', () => {
    const result = buildFacets({ loaders: {}, categories: { magic: 'exclude' } }, 'mod');
    expect(result).toContainEqual(['NOT categories:magic']);
  });

  // ── Environment facets ─────────────────────────────────────────────────────

  it('adds client_side:required + optional when client_side is "include"', () => {
    const result = buildFacets({ loaders: {}, environment: { client_side: 'include', server_side: null } }, 'mod');
    expect(result).toContainEqual(['client_side:required', 'client_side:optional']);
  });

  it('adds client_side:unsupported when client_side is "exclude"', () => {
    const result = buildFacets({ loaders: {}, environment: { client_side: 'exclude', server_side: null } }, 'mod');
    expect(result).toContainEqual(['client_side:unsupported']);
  });

  it('adds server_side:required + optional when server_side is "include"', () => {
    const result = buildFacets({ loaders: {}, environment: { client_side: null, server_side: 'include' } }, 'mod');
    expect(result).toContainEqual(['server_side:required', 'server_side:optional']);
  });

  it('adds server_side:unsupported when server_side is "exclude"', () => {
    const result = buildFacets({ loaders: {}, environment: { client_side: null, server_side: 'exclude' } }, 'mod');
    expect(result).toContainEqual(['server_side:unsupported']);
  });

  it('does not add environment facets when both sides are null', () => {
    const result = buildFacets({ loaders: {}, environment: { client_side: null, server_side: null } }, 'mod');
    expect(result).not.toContainEqual(expect.arrayContaining([expect.stringMatching(/^client_side:/)]));
    expect(result).not.toContainEqual(expect.arrayContaining([expect.stringMatching(/^server_side:/)]));
  });

  // ── Other (open_source) facets ─────────────────────────────────────────────

  it('adds open_source:true when other.open_source is "include"', () => {
    const result = buildFacets({ loaders: {}, other: { open_source: 'include' } }, 'mod');
    expect(result).toContainEqual(['open_source:true']);
  });

  it('adds NOT open_source:true when other.open_source is "exclude"', () => {
    const result = buildFacets({ loaders: {}, other: { open_source: 'exclude' } }, 'mod');
    expect(result).toContainEqual(['NOT open_source:true']);
  });

  it('does not add open_source facet when other.open_source is null', () => {
    const result = buildFacets({ loaders: {}, other: { open_source: null } }, 'mod');
    expect(result).not.toContainEqual(['open_source:true']);
    expect(result).not.toContainEqual(['NOT open_source:true']);
  });

  // ── Version facet ──────────────────────────────────────────────────────────

  it('adds a versions facet when version is set', () => {
    const result = buildFacets({ loaders: {}, version: '1.21.1' }, 'mod');
    expect(result).toContainEqual(['versions:1.21.1']);
  });

  it('trims the version string before creating the facet', () => {
    const result = buildFacets({ loaders: {}, version: '  1.20.1  ' }, 'mod');
    expect(result).toContainEqual(['versions:1.20.1']);
  });

  it('does not add a versions facet for a whitespace-only version string', () => {
    const result = buildFacets({ loaders: {}, version: '   ' }, 'mod');
    const allFacets = result.flat();
    expect(allFacets.filter((f) => f.startsWith('versions:'))).toHaveLength(0);
  });

  it('does not add a versions facet for an empty version string', () => {
    const result = buildFacets({ loaders: {}, version: '' }, 'mod');
    const allFacets = result.flat();
    expect(allFacets.filter((f) => f.startsWith('versions:'))).toHaveLength(0);
  });

  // ── Combined facets ────────────────────────────────────────────────────────

  it('builds the correct facet array for a fully-specified filter set', () => {
    const result = buildFacets(
      {
        loaders: { fabric: 'include' },
        categories: { optimization: 'include' },
        environment: { client_side: 'include', server_side: null },
        other: { open_source: 'include' },
        version: '1.21.1',
      },
      'mod',
    );
    expect(result).toContainEqual(['project_type:mod']);
    expect(result).toContainEqual(['loaders:fabric']);
    expect(result).toContainEqual(['categories:optimization']);
    expect(result).toContainEqual(['client_side:required', 'client_side:optional']);
    expect(result).toContainEqual(['open_source:true']);
    expect(result).toContainEqual(['versions:1.21.1']);
  });

  it('always places the project_type facet first', () => {
    const result = buildFacets({ loaders: { fabric: 'include' }, version: '1.21' }, 'modpack');
    expect(result[0]).toEqual(['project_type:modpack']);
  });
});
