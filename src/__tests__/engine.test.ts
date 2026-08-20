import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@/engine/EventBus';
import { Engine, __resetEngine } from '@/engine/Engine';
import { createEngine } from '@/engine/createEngine';
import { searchFeature } from '@/engine/features/search';
import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '@/engine/types';

beforeEach(() => {
  __resetEngine();
  useAppStore.getState().clearSearchHistory();
  useAppStore.getState().clearContextHistory();
  useAppStore.getState().clearMods();
  useAppStore.getState().saveProfiles([]);
});

describe('EventBus', () => {
  it('delivers events to subscribers in order', async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on('selection.clear', () => { seen.push('a'); });
    bus.on('selection.clear', () => { seen.push('b'); });
    await bus.emit('selection.clear', undefined);
    expect(seen).toEqual(['a', 'b']);
  });

  it('off removes a handler', async () => {
    const bus = new EventBus();
    let n = 0;
    const off = bus.on('selection.clear', () => { n += 1; });
    off();
    await bus.emit('selection.clear', undefined);
    expect(n).toBe(0);
  });
});

describe('Engine', () => {
  it('registers unique features and starts them once', () => {
    const mounted: string[] = [];
    const feature: Feature = {
      id: 'demo',
      label: 'Demo',
      mount() {
        mounted.push('mount');
      },
    };
    const engine = new Engine();
    engine.register(feature).start().start();
    expect(engine.has('demo')).toBe(true);
    expect(mounted).toEqual(['mount']);
    expect(() => engine.register(feature)).toThrow(/already registered/);
  });

  it('createEngine installs the built-in catalog', () => {
    const engine = createEngine().start();
    expect(engine.listFeatures().map((f) => f.id)).toEqual([
      'search',
      'selection',
      'download',
      'dependency',
      'profiles',
      'favorites',
      'settings',
      'ui',
      'catalog',
      'diagnostics',
    ]);
  });

  it('isolates a throwing handler so later listeners still run', async () => {
    const engine = new Engine().start();
    const seen: string[] = [];
    engine.on('selection.clear', () => {
      throw new Error('boom');
    });
    engine.on('selection.clear', () => {
      seen.push('ok');
    });
    await engine.emit('selection.clear', undefined);
    expect(seen).toEqual(['ok']);
    expect(engine.recentJournal().at(-1)?.ok).toBe(false);
  });

  it('runs higher-priority handlers first', async () => {
    const engine = new Engine().start();
    const seen: number[] = [];
    engine.on('selection.clear', () => { seen.push(1); }, { priority: 1 });
    engine.on('selection.clear', () => { seen.push(10); }, { priority: 10 });
    await engine.emit('selection.clear', undefined);
    expect(seen).toEqual([10, 1]);
  });

  it('can disable a feature so its handlers stop', async () => {
    const engine = createEngine().start();
    useAppStore.getState().addMod('sodium');
    engine.setEnabled('selection', false);
    await engine.emit('selection.clear', undefined);
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
    engine.setEnabled('selection', true);
    await engine.emit('selection.clear', undefined);
    expect(useAppStore.getState().selectedMods.size).toBe(0);
  });

  it('dispatches bound commands', async () => {
    const engine = new Engine().start();
    let ran = 0;
    engine.bind('download.start', () => { ran += 1; });
    await engine.dispatch('download.start');
    expect(ran).toBe(1);
    expect(engine.recentJournal().some((e) => e.event === 'download.start' && e.ok)).toBe(true);
  });
});

describe('search feature', () => {
  it('writes search and context history on search.commit', async () => {
    const engine = new Engine().register(searchFeature).start();
    await engine.emit('search.commit', {
      query: 'sodium',
      sort: 'downloads',
      filters: { loaders: {}, version: '1.21.1' },
      projectType: 'mod',
    });
    expect(useAppStore.getState().searchHistory[0]).toBe('sodium');
    expect(useAppStore.getState().contextHistory.at(-1)?.query).toBe('sodium');
  });

  it('clears and removes history entries', async () => {
    const engine = new Engine().register(searchFeature).start();
    await engine.emit('search.commit', {
      query: 'one',
      sort: 'relevance',
      filters: { loaders: {} },
      projectType: 'mod',
    });
    const id = useAppStore.getState().contextHistory[0]?.id;
    expect(id).toBeTruthy();
    await engine.emit('search.history.remove', { id: id! });
    expect(useAppStore.getState().contextHistory).toEqual([]);
    await engine.emit('search.commit', {
      query: 'two',
      sort: 'relevance',
      filters: { loaders: {} },
      projectType: 'mod',
    });
    await engine.emit('search.history.clear', undefined);
    expect(useAppStore.getState().searchHistory).toEqual([]);
    expect(useAppStore.getState().contextHistory).toEqual([]);
  });

  it('skips history when recordHistory is false', async () => {
    const engine = new Engine().register(searchFeature).start();
    await engine.emit('search.commit', {
      query: 'skip-me',
      sort: 'relevance',
      filters: { loaders: {} },
      projectType: 'mod',
      recordHistory: false,
    });
    expect(useAppStore.getState().searchHistory).toEqual([]);
    expect(useAppStore.getState().contextHistory).toEqual([]);
  });
});

describe('selection and profiles features', () => {
  it('clears the current selection', async () => {
    const engine = createEngine().start();
    useAppStore.getState().addMod('sodium');
    await engine.emit('selection.clear', undefined);
    expect(useAppStore.getState().selectedMods.size).toBe(0);
  });

  it('saves and loads a profile through events', async () => {
    const engine = createEngine().start();
    useAppStore.getState().addMod('sodium');
    await engine.emit('profiles.save', { name: 'RPG' });
    expect(useAppStore.getState().profiles[0]?.mods).toEqual(['sodium']);

    useAppStore.getState().clearMods();
    await engine.emit('profiles.load', { index: 0 });
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
  });
});
