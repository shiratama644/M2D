import type { SearchFilters } from '@/lib/helpers';
import type { DiscoverType } from '@/store/useAppStore';

export type EngineEventMap = {
  'engine.ready': { features: string[] };
  'search.commit': {
    query: string;
    sort: string;
    filters: SearchFilters;
    projectType: DiscoverType;
    recordHistory?: boolean;
  };
  'search.restore': {
    query: string;
    sort: string;
    filters: SearchFilters;
    projectType: DiscoverType;
  };
  'selection.clear': undefined;
  'download.start': undefined;
  'dependency.check': undefined;
  'profiles.save': { name: string };
  'profiles.load': { index: number };
};

export type EngineEventName = keyof EngineEventMap;

export type EngineHandler<K extends EngineEventName> = (
  payload: EngineEventMap[K],
) => void | Promise<void>;

export interface Feature {
  /** Unique id used in the catalog and debug listings. */
  readonly id: string;
  readonly label: string;
  mount(engine: import('./Engine').Engine): void | (() => void);
}
