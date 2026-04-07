import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import {
  FRIEND_LIVE_SHARING_STORAGE_KEY,
  syncContinuousLocationTask,
} from './backgroundLocation';
import { useNotificationStore } from '../stores/notificationStore';

const UPDATE_INTERVAL_MS = 30_000; // foreground backup while app is active

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export interface FriendLocation {
  user_id: string;
  username: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  last_seen_at: string;
  character_type: string | null;
  level: number | null;
}

async function uploadLocation() {
  try {
    const location = await Location.getLastKnownPositionAsync();
    if (!location) return;

    await supabase.rpc('update_my_location', {
      p_lat: location.coords.latitude,
      p_lng: location.coords.longitude,
    });
  } catch (e) {
    console.warn('Failed to upload location:', e);
  }
}

async function notifySyncContinuousTask(): Promise<void> {
  const { backgroundLocationEnabled, powerSaveMode } = useNotificationStore.getState();
  await syncContinuousLocationTask({
    friendLiveSharing: true,
    androidNearbyBackground: backgroundLocationEnabled,
    powerSave: powerSaveMode,
  });
}

export async function startLocationSharing(): Promise<boolean> {
  if (isRunning) return true;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  await supabase.rpc('toggle_location_sharing', { p_enabled: true });

  await AsyncStorage.setItem(FRIEND_LIVE_SHARING_STORAGE_KEY, 'true');

  await uploadLocation();

  // iOS/Android: “Always” 위치로 백그라운드에서도 친구 지도에 실시간에 가깝게 반영
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status === 'granted') {
    await notifySyncContinuousTask();
  }

  intervalId = setInterval(uploadLocation, UPDATE_INTERVAL_MS);
  isRunning = true;
  return true;
}

export async function stopLocationSharing(): Promise<void> {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  await AsyncStorage.removeItem(FRIEND_LIVE_SHARING_STORAGE_KEY);

  const { backgroundLocationEnabled, powerSaveMode } = useNotificationStore.getState();
  await syncContinuousLocationTask({
    friendLiveSharing: false,
    androidNearbyBackground: backgroundLocationEnabled,
    powerSave: powerSaveMode,
  });

  const { error } = await supabase.rpc('toggle_location_sharing', { p_enabled: false });
  if (error) console.warn('toggle_location_sharing:', error);
}

export async function getFriendLocations(): Promise<FriendLocation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_friend_locations', {
    p_user_id: user.id,
  });
  if (error) {
    console.warn('Failed to get friend locations:', error);
    return [];
  }
  return (data ?? []) as FriendLocation[];
}

export function subscribeToFriendLocations(
  friendIds: string[],
  onUpdate: (locations: FriendLocation[]) => void,
) {
  const channel = supabase.channel('friend-locations')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=in.(${friendIds.join(',')})`,
      },
      async () => {
        const locations = await getFriendLocations();
        onUpdate(locations);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function isLocationSharingActive(): boolean {
  return isRunning;
}
