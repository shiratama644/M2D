import type { SearchFilters } from '@/lib/helpers';
import type { DiscoverType } from '@/store/useAppStore';

export type EngineEventMap = {
  'engine.ready': { features: string[] };
  'engine.error': { source: string; error: string };
  'engine.feature': { id: string; enabled: boolean };
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
  'selection.toggle': { id: string };
  'download.start': undefined;
  'dependency.check': undefined;
  'profiles.save': { name: string };
  'profiles.load': { index: number };
};

export type EngineEventName = keyof EngineEventMap;

export type EngineHandler<K extends EngineEventName> = (
  payload: EngineEventMap[K],
) => void | Promise<void>;

export type EngineCommandName = 'download.start' | 'dependency.check';

export type EngineCommandHandler = () => void | Promise<void>;

export interface Feature {
  readonly id: string;
  readonly label: string;
  /** Other feature ids that must mount first. */
  readonly dependsOn?: readonly string[];
  mount(engine: import('./Engine').Engine): void | (() => void);
}

export interface FeatureStatus {
  id: string;
  label: string;
  enabled: boolean;
  mounted: boolean;
}

export interface JournalEntry {
  event: string;
  at: number;
  ok: boolean;
  error?: string;
}

export interface SubscribeOptions {
  /** Higher runs first. Default 0. */
  priority?: number;
}
