import {
  STORAGE_KEY,
  DEBUG_KEY,
  THEME_KEY,
  FAST_SEARCH_KEY,
  LANGUAGE_KEY,
  LOADER_KEY,
  VERSION_KEY,
  FAVORITES_KEY,
  SEARCH_HISTORY_KEY,
  SHOW_CARD_DESCRIPTION_KEY,
  ADVANCED_CONSOLE_KEY,
  DISCOVER_TYPE_KEY,
  CONTEXT_HISTORY_KEY,
} from '@/lib/helpers';

const DB_NAME = 'm2d';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

const MIGRATION_KEYS = [
  STORAGE_KEY,
  DEBUG_KEY,
  THEME_KEY,
  FAST_SEARCH_KEY,
  LANGUAGE_KEY,
  LOADER_KEY,
  VERSION_KEY,
  FAVORITES_KEY,
  SEARCH_HISTORY_KEY,
  SHOW_CARD_DESCRIPTION_KEY,
  ADVANCED_CONSOLE_KEY,
  DISCOVER_TYPE_KEY,
  CONTEXT_HISTORY_KEY,
];

const memory = new Map<string, string>();

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: string): Promise<void> {
  const opening = openDb();
  if (!opening) return;
  const db = await opening;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key: string): Promise<void> {
  const opening = openDb();
  if (!opening) return;
  const db = await opening;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbGetAll(): Promise<Record<string, string>> {
  const opening = openDb();
  if (!opening) return {};
  const db = await opening;
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keys = await requestToPromise(store.getAllKeys());
    const values = await requestToPromise(store.getAll());
    const out: Record<string, string> = {};
    keys.forEach((k, i) => {
      if (typeof k === 'string' && typeof values[i] === 'string') out[k] = values[i];
    });
    return out;
  } finally {
    db.close();
  }
}

function migrateLocalStorageOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem('m2d_idb_migrated') === '1') return;
    for (const key of MIGRATION_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value !== null && !memory.has(key)) memory.set(key, value);
    }
    window.localStorage.setItem('m2d_idb_migrated', '1');
    for (const key of MIGRATION_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Ignore quota / private-mode errors.
  }
}

/** Synchronous read from the in-memory cache (filled by set/hydrate). */
export function persistGet(key: string): string | null {
  return memory.has(key) ? memory.get(key)! : null;
}

export function persistSet(key: string, value: string): void {
  memory.set(key, value);
  void idbPut(key, value).catch(() => undefined);
}

export function persistRemove(key: string): void {
  memory.delete(key);
  void idbDelete(key).catch(() => undefined);
}

/** Load IndexedDB (and a one-time localStorage migration) into memory. */
export async function persistHydrate(): Promise<void> {
  migrateLocalStorageOnce();
  try {
    const all = await idbGetAll();
    for (const [key, value] of Object.entries(all)) memory.set(key, value);
    for (const [key, value] of memory.entries()) {
      if (!(key in all)) void idbPut(key, value).catch(() => undefined);
    }
  } catch {
    // Memory cache still has migrated or in-session values.
  }
}

export function __resetPersist(): void {
  memory.clear();
}
