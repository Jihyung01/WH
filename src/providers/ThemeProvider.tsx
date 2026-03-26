import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, type ThemeColors, type ColorMode } from '../config/theme';

const THEME_KEY = 'color_mode_override';

interface ThemeStoreState {
  override: ColorMode | 'system';
  setOverride: (mode: ColorMode | 'system') => void;
  loadOverride: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  override: 'system',
  setOverride: (mode) => {
    set({ override: mode });
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  },
  loadOverride: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ override: saved });
      }
    } catch {}
  },
}));

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: getColors('dark'),
  mode: 'dark',
  isDark: true,
  setColorMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const override = useThemeStore((s) => s.override);
  const setOverride = useThemeStore((s) => s.setOverride);

  const mode: ColorMode = override === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : override;

  const colors = useMemo(() => getColors(mode), [mode]);

  const setColorMode = useCallback((m: ColorMode | 'system') => {
    setOverride(m);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, isDark: mode === 'dark', setColorMode }),
    [colors, mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
