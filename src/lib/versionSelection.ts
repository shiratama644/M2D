import type { ModVersion } from '@/types/modrinth';

export function pickPreferredModVersion(versions: ModVersion[] | null | undefined): ModVersion | null {
  if (!versions?.length) return null;
  return versions.find((version) => version.version_type === 'release') ?? versions[0];
}

