import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearWhSyncMemoryCache } from '../stores/storage';
import { FRIEND_LIVE_SHARING_STORAGE_KEY } from '../services/backgroundLocation';
import { useNotificationStore } from '../stores/notificationStore';
import { useQuestStore } from '../stores/questStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useProfileStore } from '../stores/profileStore';
import { useMapStore } from '../stores/mapStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePremiumStore } from '../stores/premiumStore';
import { useMarkStore } from '../stores/markStore';

/**
 * Wipes user-scoped persisted UI/cache data on this device.
 * Call after `supabase.auth.signOut()` (or with signOut) so a new login does not
 * reuse nicknames / character / map state from the previous account.
 * Theme (`color_mode_override`) is intentionally kept.
 */
export async function clearUserLocalCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => {
      if (k.startsWith('@wh_zustand_')) return true;
      if (k.startsWith('@wh_sync_')) return true;
      if (k.startsWith('narrative_')) return true;
      if (k === FRIEND_LIVE_SHARING_STORAGE_KEY) return true;
      return false;
    });
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    console.warn('[clearUserLocalCaches] AsyncStorage:', e);
  }

  clearWhSyncMemoryCache();

  const persisted = [
    useNotificationStore,
    useQuestStore,
    useInventoryStore,
    useProfileStore,
    useMapStore,
    useCharacterStore,
    usePremiumStore,
    useMarkStore,
  ] as const;

  for (const store of persisted) {
    try {
      await store.persist.rehydrate();
    } catch (e) {
      console.warn('[clearUserLocalCaches] rehydrate:', e);
    }
  }

  try {
    useMarkStore.getState().clearAll();
  } catch (e) {
    console.warn('[clearUserLocalCaches] markStore.clearAll:', e);
  }
}
