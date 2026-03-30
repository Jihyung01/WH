import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { savePushToken } from '../lib/api';
import { zustandStorage } from './storage';

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
}

const DEFAULT_PREFS: NotificationPrefs = {
  nearbyEvents: true,
  dailyReminder: true,
  streakWarning: true,
  seasonEvents: true,
  friendActivity: true,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      pushToken: null,
      notifPermission: 'undetermined',
      prefs: { ...DEFAULT_PREFS },
      backgroundLocationEnabled: true,
      powerSaveMode: false,

      setPushToken: (token) => {
        set({ pushToken: token });
        if (token) {
          savePushToken(token).catch((err) => console.warn('Failed to sync push token:', err));
        }
      },
      setPermission: (perm) => set({ notifPermission: perm }),

      updatePref: (key, value) => {
        set((state) => ({ prefs: { ...state.prefs, [key]: value } }));
      },

      setBackgroundLocation: (enabled) => {
        set({ backgroundLocationEnabled: enabled });
      },

      setPowerSaveMode: (enabled) => {
        set({ powerSaveMode: enabled });
      },
    }),
    {
      name: 'wherehere-notifications',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        prefs: state.prefs,
        backgroundLocationEnabled: state.backgroundLocationEnabled,
        powerSaveMode: state.powerSaveMode,
      }),
    },
  ),
);
