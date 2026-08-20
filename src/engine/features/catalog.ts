import type { Feature } from '../types';
import { searchFeature } from './search';
import { selectionFeature } from './selection';
import { downloadFeature } from './download';
import { dependencyFeature } from './dependency';
import { profilesFeature } from './profiles';

import { diagnosticsFeature } from './diagnostics';

/**
 * Built-in features. To add one:
 * 1. Create `src/engine/features/<id>.ts` exporting a `Feature`.
 * 2. Import it here and append it to this array.
 */
export const builtinFeatures: Feature[] = [
  searchFeature,
  selectionFeature,
  downloadFeature,
  dependencyFeature,
  profilesFeature,
  diagnosticsFeature,
];
