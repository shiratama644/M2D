import { describe, it, expect } from 'vitest';
import { pickPreferredModVersion } from '@/lib/versionSelection';
import type { ModVersion } from '@/types/modrinth';

describe('pickPreferredModVersion', () => {
  it('returns null when versions are empty', () => {
    expect(pickPreferredModVersion([])).toBeNull();
  });

  it('prefers release versions over alpha/beta', () => {
    const versions = [
      { id: 'beta1', version_type: 'beta' },
      { id: 'release1', version_type: 'release' },
      { id: 'alpha1', version_type: 'alpha' },
    ] as ModVersion[];
    const selected = pickPreferredModVersion(versions);
    expect(selected?.id).toBe('release1');
  });

  it('falls back to the first version when release is unavailable', () => {
    const versions = [
      { id: 'beta1', version_type: 'beta' },
      { id: 'alpha1', version_type: 'alpha' },
    ] as ModVersion[];
    const selected = pickPreferredModVersion(versions);
    expect(selected?.id).toBe('beta1');
  });
});
