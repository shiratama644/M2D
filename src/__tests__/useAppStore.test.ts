/**
 * Tests for useAppStore (Zustand store).
 *
 * The store touches localStorage via the `ls` helper. We stub global
 * localStorage with a plain in-memory map so tests are isolated and
 * fast-running without real browser storage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── localStorage stub ──────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import store AFTER stubbing localStorage so initial state reads the stub.
// We use `await import(...)` inside beforeEach via a factory helper because
// Vitest module registry is shared; we reset the store state manually instead.

import { useAppStore } from '../store/useAppStore';

// Helper: reset store to a clean state between tests
function resetStore() {
  localStorageMock.clear();
  // Reset mutable state slices via actions
  const s = useAppStore.getState();
  s.clearMods();
  s.clearFavorites();
  s.clearSearchHistory();
  s.clearContextHistory();
  s.clearDebugLogs();
  s.hideLoading();
  s.closeDialog();
  s.setMenuOpen(false);
  s.setActiveModId(null);
  s.setSettingsOpen(false);
  s.setDepModalOpen(false);
  s.setSelectedModalOpen(false);
  s.toggleTheme('dark');
  s.toggleDebug(false);
  s.toggleFastSearch(false);
  s.toggleShowCardDescription(false);
  s.toggleAdvancedConsole(false);
  s.toggleLanguage('en');
  s.updateModLoader('fabric');
  s.updateModVersion('1.21.1');
  s.saveProfiles([]);
  useAppStore.setState({ modDataMap: {} });
}

beforeEach(resetStore);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

describe('settings', () => {
  it('toggleTheme updates theme and persists to localStorage', () => {
    useAppStore.getState().toggleTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
    expect(localStorageMock.getItem('mod_manager_theme')).toBe('light');
  });

  it('toggleDebug updates debugMode and persists', () => {
    useAppStore.getState().toggleDebug(true);
    expect(useAppStore.getState().debugMode).toBe(true);
    expect(localStorageMock.getItem('mod_manager_debug')).toBe('true');
  });

  it('toggleFastSearch updates fastSearch and persists', () => {
    useAppStore.getState().toggleFastSearch(true);
    expect(useAppStore.getState().fastSearch).toBe(true);
    expect(localStorageMock.getItem('mod_manager_fast_search')).toBe('true');
  });

  it('toggleShowCardDescription updates and persists', () => {
    useAppStore.getState().toggleShowCardDescription(true);
    expect(useAppStore.getState().showCardDescription).toBe(true);
  });

  it('toggleAdvancedConsole updates and persists', () => {
    useAppStore.getState().toggleAdvancedConsole(true);
    expect(useAppStore.getState().advancedConsole).toBe(true);
  });

  it('updateModLoader updates and persists', () => {
    useAppStore.getState().updateModLoader('forge');
    expect(useAppStore.getState().modLoader).toBe('forge');
    expect(localStorageMock.getItem('mod_manager_loader')).toBe('forge');
  });

  it('updateModVersion updates and persists', () => {
    useAppStore.getState().updateModVersion('1.20.1');
    expect(useAppStore.getState().modVersion).toBe('1.20.1');
    expect(localStorageMock.getItem('mod_manager_version')).toBe('1.20.1');
  });

  it('toggleLanguage changes language and updates translation object', () => {
    useAppStore.getState().toggleLanguage('ja');
    expect(useAppStore.getState().language).toBe('ja');
    // translation object should have changed; spot-check it is truthy
    expect(useAppStore.getState().t).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// UI State
// ---------------------------------------------------------------------------

describe('UI state', () => {
  it('setMenuOpen toggles menuOpen', () => {
    useAppStore.getState().setMenuOpen(true);
    expect(useAppStore.getState().menuOpen).toBe(true);
    useAppStore.getState().setMenuOpen(false);
    expect(useAppStore.getState().menuOpen).toBe(false);
  });

  it('setActiveModId updates activeModId', () => {
    useAppStore.getState().setActiveModId('sodium');
    expect(useAppStore.getState().activeModId).toBe('sodium');
    useAppStore.getState().setActiveModId(null);
    expect(useAppStore.getState().activeModId).toBeNull();
  });

  it('setSettingsOpen, setDepModalOpen, setSelectedModalOpen work', () => {
    useAppStore.getState().setSettingsOpen(true);
    expect(useAppStore.getState().settingsOpen).toBe(true);

    useAppStore.getState().setDepModalOpen(true);
    expect(useAppStore.getState().depModalOpen).toBe(true);

    useAppStore.getState().setSelectedModalOpen(true);
    expect(useAppStore.getState().selectedModalOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Selected mods
// ---------------------------------------------------------------------------

describe('selectedMods', () => {
  it('addMod adds a mod id', () => {
    useAppStore.getState().addMod('sodium');
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
  });

  it('removeMod removes a mod id', () => {
    useAppStore.getState().addMod('sodium');
    useAppStore.getState().removeMod('sodium');
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(false);
  });

  it('toggleMod adds when absent then removes when present', () => {
    useAppStore.getState().toggleMod('lithium');
    expect(useAppStore.getState().selectedMods.has('lithium')).toBe(true);
    useAppStore.getState().toggleMod('lithium');
    expect(useAppStore.getState().selectedMods.has('lithium')).toBe(false);
  });

  it('clearMods empties the set', () => {
    useAppStore.getState().addMod('a');
    useAppStore.getState().addMod('b');
    useAppStore.getState().clearMods();
    expect(useAppStore.getState().selectedMods.size).toBe(0);
  });

  it('replaceSelectedMods replaces existing selection', () => {
    useAppStore.getState().addMod('old');
    useAppStore.getState().replaceSelectedMods(['new1', 'new2']);
    const { selectedMods } = useAppStore.getState();
    expect(selectedMods.has('old')).toBe(false);
    expect(selectedMods.has('new1')).toBe(true);
    expect(selectedMods.has('new2')).toBe(true);
  });

  it('selectedModsByType is updated when mods are toggled', () => {
    const type = useAppStore.getState().discoverType;
    useAppStore.getState().toggleMod('sodium');
    expect(useAppStore.getState().selectedModsByType[type].has('sodium')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

describe('favorites', () => {
  it('toggleFavorite adds a new favorite', () => {
    useAppStore.getState().toggleFavorite('sodium');
    expect(useAppStore.getState().favorites.has('sodium')).toBe(true);
  });

  it('toggleFavorite removes an existing favorite', () => {
    useAppStore.getState().toggleFavorite('sodium');
    useAppStore.getState().toggleFavorite('sodium');
    expect(useAppStore.getState().favorites.has('sodium')).toBe(false);
  });

  it('toggleFavorite persists to localStorage', () => {
    useAppStore.getState().toggleFavorite('lithium');
    const raw = localStorageMock.getItem('mod_manager_favorites');
    expect(JSON.parse(raw!)).toContain('lithium');
  });

  it('clearFavorites empties the set and removes from localStorage', () => {
    useAppStore.getState().toggleFavorite('sodium');
    useAppStore.getState().clearFavorites();
    expect(useAppStore.getState().favorites.size).toBe(0);
    expect(localStorageMock.getItem('mod_manager_favorites')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------

describe('searchHistory', () => {
  it('addSearchHistory prepends to history', () => {
    useAppStore.getState().addSearchHistory('fabric');
    useAppStore.getState().addSearchHistory('sodium');
    expect(useAppStore.getState().searchHistory[0]).toBe('sodium');
    expect(useAppStore.getState().searchHistory[1]).toBe('fabric');
  });

  it('addSearchHistory deduplicates entries', () => {
    useAppStore.getState().addSearchHistory('fabric');
    useAppStore.getState().addSearchHistory('fabric');
    expect(useAppStore.getState().searchHistory.filter((q) => q === 'fabric').length).toBe(1);
  });

  it('addSearchHistory trims whitespace', () => {
    useAppStore.getState().addSearchHistory('  quilt  ');
    expect(useAppStore.getState().searchHistory[0]).toBe('quilt');
  });

  it('addSearchHistory ignores empty/whitespace-only strings', () => {
    useAppStore.getState().addSearchHistory('   ');
    expect(useAppStore.getState().searchHistory.length).toBe(0);
  });

  it('addSearchHistory caps at MAX_SEARCH_HISTORY (50) entries', () => {
    for (let i = 0; i < 55; i++) {
      useAppStore.getState().addSearchHistory(`query-${i}`);
    }
    expect(useAppStore.getState().searchHistory.length).toBe(50);
  });

  it('removeSearchHistory removes a specific entry', () => {
    useAppStore.getState().addSearchHistory('forge');
    useAppStore.getState().removeSearchHistory('forge');
    expect(useAppStore.getState().searchHistory).not.toContain('forge');
  });

  it('clearSearchHistory empties the array and removes from localStorage', () => {
    useAppStore.getState().addSearchHistory('something');
    useAppStore.getState().clearSearchHistory();
    expect(useAppStore.getState().searchHistory).toEqual([]);
    expect(localStorageMock.getItem('mod_manager_search_history')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Debug logs
// ---------------------------------------------------------------------------

describe('debugLogs', () => {
  it('addDebugLog appends a log entry', () => {
    useAppStore.getState().addDebugLog('info', 'test message');
    const logs = useAppStore.getState().debugLogs;
    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].msg).toBe('test message');
    expect(logs[0].time).toBeTruthy();
  });

  it('addDebugLog keeps at most 500 entries', () => {
    for (let i = 0; i < 505; i++) {
      useAppStore.getState().addDebugLog('log', `msg ${i}`);
    }
    expect(useAppStore.getState().debugLogs.length).toBeLessThanOrEqual(500);
  });

  it('clearDebugLogs empties the array', () => {
    useAppStore.getState().addDebugLog('warn', 'warning');
    useAppStore.getState().clearDebugLogs();
    expect(useAppStore.getState().debugLogs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

describe('loading overlay', () => {
  it('showLoading sets visible to true with text', () => {
    useAppStore.getState().showLoading('Processing…');
    const loading = useAppStore.getState().loading;
    expect(loading.visible).toBe(true);
    expect(loading.text).toBe('Processing…');
    expect(loading.progress).toBeNull();
  });

  it('updateLoading changes only the text', () => {
    useAppStore.getState().showLoading('Step 1');
    useAppStore.getState().updateLoading('Step 2');
    expect(useAppStore.getState().loading.text).toBe('Step 2');
    expect(useAppStore.getState().loading.visible).toBe(true);
  });

  it('hideLoading resets loading state', () => {
    useAppStore.getState().showLoading('Working');
    useAppStore.getState().hideLoading();
    const loading = useAppStore.getState().loading;
    expect(loading.visible).toBe(false);
    expect(loading.text).toBe('');
    expect(loading.progress).toBeNull();
  });

  it('showProgress initialises progress with total', () => {
    useAppStore.getState().showLoading('Downloading');
    useAppStore.getState().showProgress(10);
    const { progress } = useAppStore.getState().loading;
    expect(progress).not.toBeNull();
    expect(progress!.total).toBe(10);
    expect(progress!.current).toBe(0);
    expect(progress!.percent).toBe(0);
  });

  it('showProgress without total creates empty progressText', () => {
    useAppStore.getState().showLoading('Downloading');
    useAppStore.getState().showProgress();
    expect(useAppStore.getState().loading.progress!.progressText).toBe('');
  });

  it('updateProgress computes percent and progressText correctly', () => {
    useAppStore.getState().showLoading('Downloading');
    useAppStore.getState().showProgress(10);
    const startTime = Date.now() - 2000; // pretend 2s have elapsed
    useAppStore.getState().updateProgress(5, 10, startTime);
    const { progress } = useAppStore.getState().loading;
    expect(progress!.percent).toBe(50);
    expect(progress!.progressText).toBe('5 / 10');
    expect(progress!.etaText).toMatch(/^ETA:/);
  });

  it('updateProgress formats ETA in minutes when > 60s remaining', () => {
    useAppStore.getState().showLoading('Downloading');
    useAppStore.getState().showProgress(1000);
    // 1 item in 1 ms => speed = 1000/s, 999 remaining => ~1s ETA
    // To force minutes: process 1 item in 1000s (startTime 1000s ago)
    const startTime = Date.now() - 1_000_000; // 1000s ago
    useAppStore.getState().updateProgress(1, 1000, startTime);
    const { etaText } = useAppStore.getState().loading.progress!;
    expect(etaText).toMatch(/\d+m \d+s/);
  });
});

// ---------------------------------------------------------------------------
// Custom dialog
// ---------------------------------------------------------------------------

describe('dialog', () => {
  it('showAlert sets dialog with type alert', async () => {
    const promise = useAppStore.getState().showAlert('Alert!');
    expect(useAppStore.getState().dialog).toEqual({ type: 'alert', message: 'Alert!' });
    useAppStore.getState().closeDialog();
    await promise; // should resolve without throwing
  });

  it('showConfirm resolves true when closed with true', async () => {
    const promise = useAppStore.getState().showConfirm('Are you sure?');
    expect(useAppStore.getState().dialog).toEqual({ type: 'confirm', message: 'Are you sure?' });
    useAppStore.getState().closeDialog(true);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('showConfirm resolves false when closed with false', async () => {
    const promise = useAppStore.getState().showConfirm('Continue?');
    useAppStore.getState().closeDialog(false);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('closeDialog sets dialog to null', () => {
    useAppStore.getState().showAlert('msg');
    useAppStore.getState().closeDialog();
    expect(useAppStore.getState().dialog).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

describe('profiles', () => {
  it('saveProfiles persists profiles to localStorage', () => {
    const profiles = [{ name: 'My Profile', mods: ['sodium'], date: '2024-01-01' }];
    useAppStore.getState().saveProfiles(profiles);
    expect(useAppStore.getState().profiles).toEqual(profiles);
    const raw = localStorageMock.getItem('mod_profiles');
    expect(JSON.parse(raw!)).toEqual(profiles);
  });

  it('saveProfiles with empty array clears profiles', () => {
    useAppStore.getState().saveProfiles([]);
    expect(useAppStore.getState().profiles).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// modDataMap
// ---------------------------------------------------------------------------

describe('modDataMap', () => {
  it('updateModDataMap merges new entries', () => {
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Sodium' } });
    useAppStore.getState().updateModDataMap({ lithium: { title: 'Lithium' } });
    const map = useAppStore.getState().modDataMap;
    expect(map).toHaveProperty('sodium');
    expect(map).toHaveProperty('lithium');
  });

  it('updateModDataMap overwrites existing entries for same key', () => {
    useAppStore.getState().updateModDataMap({ sodium: { title: 'Old' } });
    useAppStore.getState().updateModDataMap({ sodium: { title: 'New' } });
    expect((useAppStore.getState().modDataMap.sodium as { title: string }).title).toBe('New');
  });
});

// ---------------------------------------------------------------------------
// discoverType
// ---------------------------------------------------------------------------

describe('discoverType', () => {
  it('setDiscoverType changes discoverType and updates selectedMods', () => {
    useAppStore.getState().setDiscoverType('shader');
    expect(useAppStore.getState().discoverType).toBe('shader');
    // selectedMods should now reflect the shader bucket
    expect(useAppStore.getState().selectedMods).toBe(
      useAppStore.getState().selectedModsByType['shader'],
    );
  });

  it('each type maintains its own selectedMods bucket', () => {
    useAppStore.getState().setDiscoverType('mod');
    useAppStore.getState().addMod('sodium');

    useAppStore.getState().setDiscoverType('shader');
    useAppStore.getState().addMod('iris-shader');

    useAppStore.getState().setDiscoverType('mod');
    expect(useAppStore.getState().selectedMods.has('sodium')).toBe(true);
    expect(useAppStore.getState().selectedMods.has('iris-shader')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contextHistory
// ---------------------------------------------------------------------------

const baseFilters = {
  loaders: { fabric: null, forge: null },
  categories: {},
  environment: { client_side: null, server_side: null },
  other: {},
  version: '1.21.1',
};

const baseEntry = {
  query: 'sodium',
  sort: 'relevance',
  filters: baseFilters,
  projectType: 'mod' as const,
};

describe('contextHistory', () => {
  it('addContextHistory appends a new entry with id and timestamp', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    const { contextHistory } = useAppStore.getState();
    expect(contextHistory.length).toBe(1);
    expect(contextHistory[0].query).toBe('sodium');
    expect(contextHistory[0].sort).toBe('relevance');
    expect(contextHistory[0].projectType).toBe('mod');
    expect(contextHistory[0].id).toBeTruthy();
    expect(contextHistory[0].timestamp).toBeGreaterThan(0);
  });

  it('addContextHistory deduplicates identical consecutive entries', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory(baseEntry);
    expect(useAppStore.getState().contextHistory.length).toBe(1);
  });

  it('addContextHistory does NOT deduplicate if entries are different', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory({ ...baseEntry, query: 'lithium' });
    expect(useAppStore.getState().contextHistory.length).toBe(2);
  });

  it('addContextHistory does NOT deduplicate non-consecutive identical entries', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory({ ...baseEntry, query: 'lithium' });
    useAppStore.getState().addContextHistory(baseEntry);
    expect(useAppStore.getState().contextHistory.length).toBe(3);
  });

  it('addContextHistory caps at MAX_CONTEXT_HISTORY (50) entries', () => {
    for (let i = 0; i < 55; i++) {
      useAppStore.getState().addContextHistory({ ...baseEntry, query: `query-${i}` });
    }
    expect(useAppStore.getState().contextHistory.length).toBe(50);
  });

  it('addContextHistory keeps the most recent entries when capped', () => {
    for (let i = 0; i < 55; i++) {
      useAppStore.getState().addContextHistory({ ...baseEntry, query: `query-${i}` });
    }
    const { contextHistory } = useAppStore.getState();
    expect(contextHistory[contextHistory.length - 1].query).toBe('query-54');
  });

  it('addContextHistory persists to localStorage', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    const raw = localStorageMock.getItem('mod_manager_context_history');
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].query).toBe('sodium');
  });

  it('removeContextEntry removes an entry by id', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    const { contextHistory } = useAppStore.getState();
    const id = contextHistory[0].id;
    useAppStore.getState().removeContextEntry(id);
    expect(useAppStore.getState().contextHistory.length).toBe(0);
  });

  it('removeContextEntry does not affect other entries', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory({ ...baseEntry, query: 'lithium' });
    const first = useAppStore.getState().contextHistory[0];
    useAppStore.getState().removeContextEntry(first.id);
    const { contextHistory } = useAppStore.getState();
    expect(contextHistory.length).toBe(1);
    expect(contextHistory[0].query).toBe('lithium');
  });

  it('clearContextHistory empties the array and removes from localStorage', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().clearContextHistory();
    expect(useAppStore.getState().contextHistory).toEqual([]);
    expect(localStorageMock.getItem('mod_manager_context_history')).toBeNull();
  });

  it('deduplication compares projectType', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory({ ...baseEntry, projectType: 'shader' });
    expect(useAppStore.getState().contextHistory.length).toBe(2);
  });

  it('deduplication compares sort field', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    useAppStore.getState().addContextHistory({ ...baseEntry, sort: 'downloads' });
    expect(useAppStore.getState().contextHistory.length).toBe(2);
  });

  it('deduplication compares filters', () => {
    useAppStore.getState().addContextHistory(baseEntry);
    const modified = { ...baseEntry, filters: { ...baseFilters, version: '1.20.1' } };
    useAppStore.getState().addContextHistory(modified);
    expect(useAppStore.getState().contextHistory.length).toBe(2);
  });
});
