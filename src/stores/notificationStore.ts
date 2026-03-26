import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'notification_prefs';
const BG_LOCATION_KEY = 'bg_location_enabled';
const POWER_SAVE_KEY = 'power_save_mode';

export interface NotificationPrefs {
  nearbyEvents: boolean;
  dailyReminder: boolean;
  streakWarning: boolean;
  seasonEvents: boolean;
  friendActivity: boolean;
}

interface NotificationState {
  pushToken: string | null;
  notifPermission: 'undetermined' | 'granted' | 'denied';
  prefs: NotificationPrefs;
  backgroundLocationEnabled: boolean;
  powerSaveMode: boolean;

  setPushToken: (token: string | null) => void;
  setPermission: (perm: 'undetermined' | 'granted' | 'denied') => void;
  updatePref: (key: keyof NotificationPrefs, value: boolean) => void;
  setBackgroundLocation: (enabled: boolean) => void;
  setPowerSaveMode: (enabled: boolean) => void;
  loadPrefs: () => Promise<void>;
  persistPrefs: () => Promise<void>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  nearbyEvents: true,
  dailyReminder: true,
  streakWarning: true,
  seasonEvents: true,
  friendActivity: true,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  pushToken: null,
  notifPermission: 'undetermined',
  prefs: { ...DEFAULT_PREFS },
  backgroundLocationEnabled: false,
  powerSaveMode: false,

  setPushToken: (token) => set({ pushToken: token }),
  setPermission: (perm) => set({ notifPermission: perm }),

  updatePref: (key, value) => {
    set((state) => ({ prefs: { ...state.prefs, [key]: value } }));
    get().persistPrefs();
  },

  setBackgroundLocation: (enabled) => {
    set({ backgroundLocationEnabled: enabled });
    AsyncStorage.setItem(BG_LOCATION_KEY, JSON.stringify(enabled)).catch(() => {});
  },

  setPowerSaveMode: (enabled) => {
    set({ powerSaveMode: enabled });
    AsyncStorage.setItem(POWER_SAVE_KEY, JSON.stringify(enabled)).catch(() => {});
  },

  loadPrefs: async () => {
    try {
      const [prefsJson, bgJson, psJson] = await Promise.all([
        AsyncStorage.getItem(PREFS_KEY),
        AsyncStorage.getItem(BG_LOCATION_KEY),
        AsyncStorage.getItem(POWER_SAVE_KEY),
      ]);
      if (prefsJson) set({ prefs: { ...DEFAULT_PREFS, ...JSON.parse(prefsJson) } });
      if (bgJson) set({ backgroundLocationEnabled: JSON.parse(bgJson) });
      if (psJson) set({ powerSaveMode: JSON.parse(psJson) });
    } catch {
      // defaults are fine
    }
  },

  persistPrefs: async () => {
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(get().prefs));
    } catch {
      // silent
    }
  },
}));
