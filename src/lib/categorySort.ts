import type { ModCategory } from '@/types/modrinth';

export const HEADER_ORDER = ['categories', 'features', 'resolutions', 'performance_impact'];

export const PERFORMANCE_IMPACT_ORDER = ['potato', 'low', 'medium', 'high', 'fancy', 'screenshot-utility'];

export function headerSortIndex(header: string): number {
  const index = HEADER_ORDER.indexOf(header);
  return index === -1 ? HEADER_ORDER.length : index;
}

export function performanceImpactSortIndex(name: string): number {
  const index = PERFORMANCE_IMPACT_ORDER.indexOf(name);
  return index === -1 ? PERFORMANCE_IMPACT_ORDER.length : index;
}

export function resolutionSortKey(name: string): number {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function categoryItemComparator(a: ModCategory, b: ModCategory): number {
  if (a.header === 'performance_impact') {
    return performanceImpactSortIndex(a.name) - performanceImpactSortIndex(b.name);
  }
  if (a.header === 'resolutions') {
    return resolutionSortKey(a.name) - resolutionSortKey(b.name);
  }
  return a.name.localeCompare(b.name);
}

export function sortCategories(categories: ModCategory[], projectType: string): ModCategory[] {
  return categories
    .filter((c) => c.project_type === projectType)
    .sort(
      (a, b) =>
        headerSortIndex(a.header) - headerSortIndex(b.header) ||
        categoryItemComparator(a, b),
    );
}

export function groupCategories(categories: ModCategory[]): Array<{ header: string; items: ModCategory[] }> {
  const map = new Map<string, ModCategory[]>();
  for (const cat of categories) {
    const group = map.get(cat.header);
    if (group) {
      group.push(cat);
    } else {
      map.set(cat.header, [cat]);
    }
  }
  return Array.from(map.entries()).map(([header, items]) => ({ header, items }));
}
