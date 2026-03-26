import cubeIconRaw from '@/assets/icons/cube.svg';
import packageIconRaw from '@/assets/icons/package.svg';
import imageIconRaw from '@/assets/icons/image.svg';
import sparklesIconRaw from '@/assets/icons/sparkles.svg';
import type { DiscoverType } from '@/store/useAppStore';
import type { Translation } from '@/i18n/translations';

export interface DiscoverOption {
  type: DiscoverType;
  label: string;
  icon: string;
}

/** Returns the four discover-type buttons in display order with translated labels. */
export function getDiscoverOptions(t: Translation): DiscoverOption[] {
  return [
    { type: 'mod',         label: t.discover.mod,     icon: cubeIconRaw },
    { type: 'modpack',     label: t.discover.modpack,  icon: packageIconRaw },
    { type: 'resourcepack', label: t.discover.texture, icon: imageIconRaw },
    { type: 'shader',      label: t.discover.shader,   icon: sparklesIconRaw },
  ];
}
