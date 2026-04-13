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
    let location = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    if (!location) {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }
    if (!location) return;

    const { error } = await supabase.rpc('update_my_location', {
      p_lat: location.coords.latitude,
      p_lng: location.coords.longitude,
    });
    if (error) throw error;
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

  const { error } = await supabase.rpc('toggle_location_sharing', { p_enabled: true });
  if (error) {
    console.warn('toggle_location_sharing:', error);
    return false;
  }

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

/** error 시 null — UI는 이전 마커 유지(깜빡임 방지) */
export async function getFriendLocationsSafe(userId?: string): Promise<FriendLocation[] | null> {
  const resolvedUserId =
    userId ??
    (await supabase.auth.getUser()).data.user?.id ??
    null;
  if (!resolvedUserId) return null;

  const { data, error } = await supabase.rpc('get_friend_locations', {
    p_user_id: resolvedUserId,
  });
  if (error) {
    console.warn('Failed to get friend locations:', error);
    return null;
  }
  return (data ?? []) as FriendLocation[];
}

export async function getFriendLocations(): Promise<FriendLocation[]> {
  const res = await getFriendLocationsSafe();
  return res ?? [];
}

export async function getLocationSharingStatus(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('location_sharing')
    .eq('id', user.id)
    .single();

  if (error) {
    const local = await AsyncStorage.getItem(FRIEND_LIVE_SHARING_STORAGE_KEY);
    return local === 'true';
  }

  return !!data?.location_sharing;
}

const FRIEND_LOC_REALTIME_DEBOUNCE_MS = 400;

/**
 * Realtime 구독 시 `viewerUserId`를 넘겨 auth.getUser() 레이스를 피합니다.
 * 디바운스로 연속 UPDATE 시 RPC/상태 폭주·마커 깜빡임을 줄입니다.
 */
export function subscribeToFriendLocations(
  friendIds: string[],
  viewerUserId: string,
  onUpdate: (locations: FriendLocation[]) => void,
) {
  if (friendIds.length === 0 || !viewerUserId) {
    return () => {};
  }

  const uniqueSorted = [...new Set(friendIds)].sort();
  const inList = uniqueSorted.map((id) => `"${id}"`).join(',');

  let disposed = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const runRefetch = () => {
    if (disposed) return;
    void (async () => {
      const locations = await getFriendLocationsSafe(viewerUserId);
      if (disposed || locations === null) return;
      onUpdate(locations);
    })();
  };

  const scheduleRefetch = () => {
    if (disposed) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runRefetch();
    }, FRIEND_LOC_REALTIME_DEBOUNCE_MS);
  };

  const channel = supabase
    .channel(`friend-loc-${viewerUserId.slice(0, 12)}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=in.(${inList})`,
      },
      () => {
        scheduleRefetch();
      },
    )
    .subscribe();

  return () => {
    disposed = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    supabase.removeChannel(channel);
  };
}

/**
 * 앱 재실행 후 DB에 location_sharing=true인데 포그라운드 interval이 멈춘 경우 복구.
 * (백그라운드 태스크는 AsyncStorage 키로 이미 동작할 수 있음)
 */
export async function ensureFriendLocationPublishingIfNeeded(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('location_sharing')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data?.location_sharing) return;

  await AsyncStorage.setItem(FRIEND_LIVE_SHARING_STORAGE_KEY, 'true');

  if (intervalId) {
    await notifySyncContinuousTask();
    return;
  }

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return;

  await uploadLocation();
  await notifySyncContinuousTask();
  intervalId = setInterval(uploadLocation, UPDATE_INTERVAL_MS);
  isRunning = true;
}

export function isLocationSharingActive(): boolean {
  return isRunning;
}
