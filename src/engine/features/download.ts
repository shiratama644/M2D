import type { Engine } from '../Engine';
import type { Feature } from '../types';

/**
 * Download is bound at runtime by the UI (JSZip / FileSaver live in a hook).
 * The feature just guarantees the event exists on the bus.
 */
export const downloadFeature: Feature = {
  id: 'download',
  label: 'Download',
  mount(_engine: Engine) {
    return undefined;
  },
};
