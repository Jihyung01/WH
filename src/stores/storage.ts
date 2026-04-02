import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Synchronous facade backed by in-memory cache + AsyncStorage persistence.
 * Replaces MMKV usage to avoid JSI/native crash paths.
 */
const SYNC_KEY_PREFIX = '@wh_sync_';
const ZUSTAND_PREFIX = '@wh_zustand_';

const mem = new Map<string, string>();
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;

function persistSyncKey(key: string): string {
  return `${SYNC_KEY_PREFIX}${key}`;
}

function ensureHydrated(): Promise<void> {
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((k) => k.startsWith(SYNC_KEY_PREFIX));
      if (ours.length > 0) {
        const pairs = await AsyncStorage.multiGet(ours);
        for (const [k, v] of pairs) {
          if (v != null) mem.set(k.slice(SYNC_KEY_PREFIX.length), v);
        }
      }
    } catch {
      // ignore hydration errors
    } finally {
      hydrated = true;
    }
  })();

  return hydrationPromise;
}

void ensureHydrated();

function parseTyped<T extends 'string' | 'boolean' | 'number'>(
  key: string,
  expectedType: T,
): string | boolean | number | undefined {
  if (!hydrated) void ensureHydrated();

  const raw = mem.get(key);
  if (raw === undefined) return undefined;

  try {
    const value = JSON.parse(raw) as unknown;
    return typeof value === expectedType ? value : undefined;
  } catch {
    return undefined;
  }
}

export const storage = {
  getString: (key: string) => parseTyped(key, 'string') as string | undefined,
  getBoolean: (key: string) => parseTyped(key, 'boolean') as boolean | undefined,
  getNumber: (key: string) => parseTyped(key, 'number') as number | undefined,
  set: (key: string, value: boolean | string | number) => {
    const encoded = JSON.stringify(value);
    mem.set(key, encoded);
    void AsyncStorage.setItem(persistSyncKey(key), encoded);
  },
  delete: (key: string) => {
    mem.delete(key);
    void AsyncStorage.removeItem(persistSyncKey(key));
  },
};

const zustandAsyncStorage: StateStorage = {
  getItem: async (name) => (await AsyncStorage.getItem(ZUSTAND_PREFIX + name)) ?? null,
  setItem: async (name, value) => {
    await AsyncStorage.setItem(ZUSTAND_PREFIX + name, value);
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(ZUSTAND_PREFIX + name);
  },
};

export const zustandStorage: StateStorage = zustandAsyncStorage;
