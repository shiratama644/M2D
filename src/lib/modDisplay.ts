export interface DisplayableMod {
  id?: string;
  title?: string;
  slug?: string;
  icon_url?: string | null;
}

/** True for opaque Modrinth project IDs and file hashes — not human-readable names. */
export function isOpaqueModId(value: string): boolean {
  return (
    /^[a-zA-Z0-9]{8}$/.test(value) ||
    /^[a-f0-9]{40}$/i.test(value) ||
    /^[a-f0-9]{64}$/i.test(value)
  );
}

export function lookupMod(
  map: Record<string, unknown>,
  id: string,
): DisplayableMod | undefined {
  return map[id] as DisplayableMod | undefined;
}

/**
 * Human-readable label for a stored mod id.
 * Never falls back to a raw project id or file hash.
 */
export function displayModTitle(
  map: Record<string, unknown>,
  id: string,
  unknownLabel = 'Unknown mod',
): string {
  const mod = lookupMod(map, id);
  const title = mod?.title?.trim();
  if (title) return title;
  const slug = mod?.slug?.trim();
  if (slug && !isOpaqueModId(slug)) return slug;
  if (isOpaqueModId(id)) return unknownLabel;
  return id;
}

/** Index API projects under both id and slug so either key resolves. */
export function indexProjects(
  projects: Array<{ id: string; slug?: string } & Record<string, unknown>>,
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const project of projects) {
    map[project.id] = project;
    if (project.slug) map[project.slug] = project;
  }
  return map;
}
