import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const storage = new MMKV({ id: 'wherehere-global-storage' });

/**
 * Zustand persist middleware compatible storage adapter.
 * 10x faster than AsyncStorage for read/write operations.
 */
export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value);
  },
  getItem: (name) => {
    return storage.getString(name) ?? null;
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};

/**
 * Supabase Auth compatible storage adapter (async interface).
 * Replaces @react-native-async-storage/async-storage for auth session persistence.
 */
export const supabaseStorage = {
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(storage.getString(key) ?? null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    storage.delete(key);
    return Promise.resolve();
  },
};
