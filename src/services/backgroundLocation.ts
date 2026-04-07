import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { notificationService } from './notificationService';
import { getDistance } from '../utils/geo';
import type { GeoPoint } from '../types';

export const BG_LOCATION_TASK = 'wherehere-bg-location';

/** Set by `friendLocation` when live sharing is on — background task uploads coords for Zenly-style friend map. */
export const FRIEND_LIVE_SHARING_STORAGE_KEY = 'wherehere_friend_live_sharing';
const NOTIFIED_EVENTS_KEY = 'bg_notified_events';
const PROXIMITY_RADIUS_M = 200;
const QUIET_HOURS_START = 23;
const QUIET_HOURS_END = 7;

interface StoredEvent {
  id: string;
  title: string;
  location: GeoPoint;
}

const NEARBY_EVENTS_KEY = 'bg_nearby_events_cache';

function isQuietHours(): boolean {
  const h = new Date().getHours();
  return h >= QUIET_HOURS_START || h < QUIET_HOURS_END;
}

async function getNotifiedSet(): Promise<Set<string>> {
  try {
    const json = await AsyncStorage.getItem(NOTIFIED_EVENTS_KEY);
    return json ? new Set(JSON.parse(json)) : new Set();
  } catch {
    return new Set();
  }
}

async function markNotified(eventId: string): Promise<void> {
  const set = await getNotifiedSet();
  set.add(eventId);
  // Keep only last 200 entries
  const arr = Array.from(set).slice(-200);
  await AsyncStorage.setItem(NOTIFIED_EVENTS_KEY, JSON.stringify(arr));
}

/**
 * Cache nearby events for the background task to compare against.
 * Called from foreground when events are loaded.
 */
export async function cacheEventsForBackground(events: StoredEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NEARBY_EVENTS_KEY, JSON.stringify(events.slice(0, 50)));
  } catch {
    // silent
  }
}

async function getCachedEvents(): Promise<StoredEvent[]> {
  try {
    const json = await AsyncStorage.getItem(NEARBY_EVENTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

// ── Define the background task ──
// Guard duplicate registrations to avoid startup fatal errors.
if (!TaskManager.isTaskDefined(BG_LOCATION_TASK)) {
TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const latest = locations[locations.length - 1];
  const userPos: GeoPoint = {
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
  };

  // 1) Live friend location (Zenly-style) — runs whenever sharing is on; not blocked by quiet hours
  try {
    const live = await AsyncStorage.getItem(FRIEND_LIVE_SHARING_STORAGE_KEY);
    if (live === 'true') {
      await supabase.rpc('update_my_location', {
        p_lat: userPos.latitude,
        p_lng: userPos.longitude,
      });
    }
  } catch {
    // ignore
  }

  // 2) Proximity alerts (Android “nearby events” only — iOS uses geofencing for that)
  if (Platform.OS !== 'android') return;

  if (isQuietHours()) return;

  try {
    const psJson = await AsyncStorage.getItem('power_save_mode');
    if (psJson && JSON.parse(psJson) === true) return;
  } catch {}

  const events = await getCachedEvents();
  const notified = await getNotifiedSet();

  for (const event of events) {
    if (notified.has(event.id)) continue;

    const dist = getDistance(userPos, event.location);
    if (dist <= PROXIMITY_RADIUS_M) {
      await notificationService.sendNearbyEventAlert(event.title, dist, event.id);
      await markNotified(event.id);
      break;
    }
  }
});
}

export const backgroundLocationService = {
  /**
   * Start background location updates.
   * Requires Location.requestBackgroundPermissionsAsync() to have been granted.
   */
  async start(): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status !== 'granted') return false;

    const isRunning = await TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK);
    if (isRunning) return true;

    await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 40,
      deferredUpdatesInterval: 45000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'WhereHere',
        notificationBody: '친구에게 위치 공유 중 · 주변 탐험 알림',
        notificationColor: '#2DD4A8',
      },
    });

    return true;
  },

  async stop(): Promise<void> {
    const isRunning = await TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
    }
  },

  async isRunning(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK);
  },

  /**
   * Prompt the user for background location permission.
   * Returns true if granted.
   */
  async requestBackgroundPermission(): Promise<boolean> {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Check if background permission is already granted without prompting.
   */
  async hasBackgroundPermission(): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  },
};

/**
 * One continuous background location task serves (1) live friend uploads on iOS+Android
 * and (2) proximity pings on Android. Call after toggling friend sharing or notification prefs.
 */
export async function syncContinuousLocationTask(options: {
  friendLiveSharing: boolean;
  androidNearbyBackground: boolean;
  powerSave: boolean;
}): Promise<void> {
  const wantFriend = options.friendLiveSharing;
  const wantNearbyAndroid =
    Platform.OS === 'android' && options.androidNearbyBackground && !options.powerSave;
  const shouldRun = (wantFriend || wantNearbyAndroid) && !options.powerSave;

  if (!shouldRun) {
    await backgroundLocationService.stop();
    return;
  }

  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await backgroundLocationService.start();
}
