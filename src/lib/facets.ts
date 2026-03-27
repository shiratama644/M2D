import type { SearchFilters } from '@/lib/helpers';

/**
 * Converts a SearchFilters object and a project type into a Modrinth facets
 * array suitable for use in search requests.
 *
 * See https://docs.modrinth.com/api-spec/#tag/projects/operation/searchProjects
 */
export function buildFacets(filters: SearchFilters | null | undefined, projectType: string): string[][] {
  const facets: string[][] = [[`project_type:${projectType}`]];
  if (!filters) return facets;

  const included = Object.entries(filters.loaders || {})
    .filter(([, v]) => v === 'include')
    .map(([k]) => `loaders:${k}`);
  const excluded = Object.entries(filters.loaders || {})
    .filter(([, v]) => v === 'exclude');

  if (included.length > 0) facets.push(included);
  excluded.forEach(([k]) => facets.push([`NOT loaders:${k}`]));

  const includedCats = Object.entries(filters.categories || {})
    .filter(([, v]) => v === 'include')
    .map(([k]) => `categories:${k}`);
  const excludedCats = Object.entries(filters.categories || {})
    .filter(([, v]) => v === 'exclude');

  if (includedCats.length > 0) facets.push(includedCats);
  excludedCats.forEach(([k]) => facets.push([`NOT categories:${k}`]));

  if (filters.environment) {
    const cs = filters.environment.client_side;
    const ss = filters.environment.server_side;
    if (cs === 'include') facets.push(['client_side:required', 'client_side:optional']);
    else if (cs === 'exclude') facets.push(['client_side:unsupported']);
    if (ss === 'include') facets.push(['server_side:required', 'server_side:optional']);
    else if (ss === 'exclude') facets.push(['server_side:unsupported']);
  }

  if (filters.other?.open_source === 'include') facets.push(['open_source:true']);
  else if (filters.other?.open_source === 'exclude') facets.push(['NOT open_source:true']);

  if (filters.version?.trim()) facets.push([`versions:${filters.version.trim()}`]);

  return facets;
}
