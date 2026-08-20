import type { ModVersion } from '@/types/modrinth';

export function pickPreferredModVersion(
  versions: ModVersion[] | null | undefined,
  pinnedVersionId?: string | null,
): ModVersion | null {
  if (!versions?.length) return null;
  if (pinnedVersionId) {
    const pinned = versions.find((version) => version.id === pinnedVersionId);
    if (pinned) return pinned;
  }
  return versions.find((version) => version.version_type === 'release') ?? versions[0];
}
