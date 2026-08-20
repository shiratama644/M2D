import type { SearchFilters } from '@/lib/helpers';
import type { DiscoverType } from '@/store/useAppStore';
import type { GameVersion, ModCategory, ModProject, ModVersion } from '@/types/modrinth';
import type { SearchResult } from '@/lib/api/modrinth';

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
  'search.history.clear': undefined;
  'search.history.remove': { id: string };
  'selection.clear': undefined;
  'selection.toggle': { id: string };
  'selection.add': { id: string };
  'selection.remove': { id: string };
  'selection.replace': { ids: string[] };
  'favorites.toggle': { id: string };
  'favorites.clear': undefined;
  'mods.activate': { id: string | null };
  'mods.pinVersion': { id: string; versionId: string | null };
  'discover.set': { type: DiscoverType };
  'settings.theme': { value: string };
  'settings.language': { value: string };
  'settings.loader': { value: string };
  'settings.version': { value: string };
  'settings.flag': {
    key: 'debug' | 'fastSearch' | 'showCardDescription' | 'advancedConsole';
    value: boolean;
  };
  'ui.open': { panel: 'menu' | 'settings' | 'history' | 'favorites' | 'selected' | 'deps' };
  'ui.close': { panel: 'menu' | 'settings' | 'history' | 'favorites' | 'selected' | 'deps' };
  'download.start': undefined;
  'dependency.check': undefined;
  'profiles.save': { name: string };
  'profiles.load': { index: number };
  'profiles.delete': { index: number };
  'profiles.rename': { index: number; name: string };
  'profiles.import': { name: string; mods: string[] };
};

export type EngineEventName = keyof EngineEventMap;

export type EngineHandler<K extends EngineEventName> = (
  payload: EngineEventMap[K],
) => void | Promise<void>;

export type EngineCommandMap = {
  'download.start': undefined;
  'dependency.check': undefined;
  'catalog.search': {
    query: string;
    facets: string[][];
    offset: number;
    limit: number;
    index: string;
    signal?: AbortSignal;
  };
  'catalog.project': { id: string; signal?: AbortSignal };
  'catalog.projects': { ids: string[]; signal?: AbortSignal };
  'catalog.versions': { id: string; loader: string; version: string; signal?: AbortSignal };
  'catalog.versionsBulk': { ids: string[]; signal?: AbortSignal };
  'catalog.gameVersions': { signal?: AbortSignal };
  'catalog.categories': { signal?: AbortSignal };
  'catalog.versionFile': { hash: string; signal?: AbortSignal };
};

export type EngineCommandName = keyof EngineCommandMap;

export type EngineCommandResult = {
  'download.start': void;
  'dependency.check': void;
  'catalog.search': SearchResult;
  'catalog.project': ModProject;
  'catalog.projects': ModProject[];
  'catalog.versions': ModVersion[];
  'catalog.versionsBulk': ModVersion[];
  'catalog.gameVersions': GameVersion[];
  'catalog.categories': ModCategory[];
  'catalog.versionFile': ModVersion | null;
};

export type EngineCommandHandler<K extends EngineCommandName = EngineCommandName> = (
  payload: EngineCommandMap[K],
) => EngineCommandResult[K] | Promise<EngineCommandResult[K]>;

/**
 * Storage-friendly, command-agnostic handler shape.
 * `never` as the parameter type keeps it assignable from every
 * `EngineCommandHandler<K>` (parameters are contravariant).
 */
export type AnyEngineCommandHandler = (payload: never) => unknown;

export interface Feature {
  readonly id: string;
  readonly label: string;
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
  priority?: number;
}
