import type { Feature } from '../types';
import { searchFeature } from './search';
import { selectionFeature } from './selection';
import { downloadFeature } from './download';
import { dependencyFeature } from './dependency';
import { profilesFeature } from './profiles';
import { diagnosticsFeature } from './diagnostics';
import { favoritesFeature } from './favorites';
import { settingsFeature } from './settings';
import { uiFeature } from './ui';
import { catalogFeature } from './catalogApi';
import { authFeature } from './auth';

export const builtinFeatures: Feature[] = [
  searchFeature,
  selectionFeature,
  downloadFeature,
  dependencyFeature,
  profilesFeature,
  favoritesFeature,
  settingsFeature,
  uiFeature,
  catalogFeature,
  authFeature,
  diagnosticsFeature,
];
