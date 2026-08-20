import type { Feature } from '../types';

export const dependencyFeature: Feature = {
  id: 'dependency',
  label: 'Dependency check',
  mount() {
    return undefined;
  },
};
