import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase Auth storage via AsyncStorage only.
 * MMKV migration path removed to avoid JSI/native crash paths.
 */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return (await AsyncStorage.getItem(key)) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};
