import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMMKV } from './storage';

/**
 * Supabase Auth — AsyncStorage (RN 권장). 세션 복원 시 MMKV 동기 접근을 피함.
 * 예전에 MMKV에만 있던 키는 한 번 읽어 AsyncStorage로 옮김.
 */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const v = await AsyncStorage.getItem(key);
    if (v != null) return v;
    try {
      const legacy = getMMKV().getString(key);
      if (legacy != null) {
        await AsyncStorage.setItem(key, legacy);
        getMMKV().delete(key);
      }
      return legacy ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
    try {
      getMMKV().delete(key);
    } catch {
      /* ignore */
    }
  },
};
