import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'timekeeper-db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const MIGRATION_FLAG = '__ls_migrated';

const cache = new Map<string, string>();
let db_instance: IDBPDatabase | null = null;
let init_promise: Promise<void> | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db_instance) return db_instance;

  db_instance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

  return db_instance;
}

async function migrateFromLocalStorage(db: IDBPDatabase): Promise<void> {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    const value = localStorage.getItem(key);
    if (value !== null) {
      await store.put(value, key);
      cache.set(key, value);
    }
  }

  await store.put('true', MIGRATION_FLAG);
  await tx.done;
}

async function performInit(): Promise<void> {
  try {
    const db = await getDB();

    const migrated = await db.get(STORE_NAME, MIGRATION_FLAG);
    if (migrated !== 'true' && localStorage.length > 0) {
      await migrateFromLocalStorage(db);
    }

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all_keys = await store.getAllKeys();

    for (const key of all_keys) {
      if (key === MIGRATION_FLAG) continue;
      const value = await store.get(key);
      if (value !== undefined) {
        cache.set(String(key), String(value));
      }
    }

    await tx.done;
    requestPersistentStorage();
  } catch (err) {
    console.error('[TimeKeeper] IndexedDB initialization failed:', err);
  }
}

export function initStorage(): Promise<void> {
  if (init_promise) return init_promise;
  init_promise = performInit();
  return init_promise;
}

export function getItem(key: string): string | null {
  return cache.get(key) ?? null;
}

export function setItem(key: string, value: string): void {
  cache.set(key, value);
  getDB().then(db => db.put(STORE_NAME, value, key)).catch(() => {});
}

export function removeItem(key: string): void {
  cache.delete(key);
  getDB().then(db => db.delete(STORE_NAME, key)).catch(() => {});
}

export const idbStorage = {
  getItem: (name: string): string | null => cache.get(name) ?? null,
  setItem: (name: string, value: string): void => setItem(name, value),
  removeItem: (name: string): void => removeItem(name),
};

export function getStorageUsage(): { usageKB: string; usageMB: string } {
  let total = 0;
  for (const [key, value] of cache.entries()) {
    total += (key.length + value.length) * 2;
  }
  return {
    usageKB: (total / 1024).toFixed(1),
    usageMB: (total / (1024 * 1024)).toFixed(2),
  };
}

export function getAllItems(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of cache.entries()) {
    result[key] = value;
  }
  return result;
}

export async function batchSetItems(items: Record<string, string>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (const [key, value] of Object.entries(items)) {
    cache.set(key, value);
    await store.put(value, key);
  }

  await tx.done;
}

export async function clearAll(): Promise<void> {
  cache.clear();
  const db = await getDB();
  await db.clear(STORE_NAME);
}

async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}
