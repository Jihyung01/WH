import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { storage } from '../stores/storage';

const GEOFENCE_TASK = 'wherehere-geofence-task';
const GEOFENCE_RADIUS_M = 500;
const COOLDOWN_MS = 30 * 60 * 1000; // 30분 쿨다운 (같은 이벤트 반복 알림 방지)
const MAX_GEOFENCE_REGIONS = 20; // iOS 최대 20개 동시 모니터링

interface CachedEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  category: string;
  characterName?: string;
}

const CHARACTER_MESSAGES: Record<string, Record<string, string>> = {
  explorer: {
    exploration: '이가 근처에서 탐험 포인트를 발견했어요! 🌿',
    photo: '이가 사진 찍기 좋은 곳을 찾았어요! 📸',
    quiz: '이가 수상한 퀴즈를 발견했어요! 🧩',
    partnership: '이가 특별한 제휴 이벤트를 발견했어요! ⭐',
  },
  foodie: {
    exploration: '이가 새로운 바람의 흔적을 감지했어요! 🍃',
    photo: '이가 멋진 풍경을 포착했어요! 🌊',
    quiz: '이가 신비한 문제를 발견했어요! 💨',
    partnership: '이가 특별한 장소를 발견했어요! 🌟',
  },
  artist: {
    exploration: '이가 미지의 지식을 감지했어요! 🌤️',
    photo: '이가 빛나는 순간을 포착했어요! ☀️',
    quiz: '이가 지식의 단서를 찾았어요! 🔥',
    partnership: '이가 특별한 학습 기회를 발견했어요! 💎',
  },
  socialite: {
    exploration: '이가 새로운 연결 고리를 감지했어요! ✨',
    photo: '이가 별빛 같은 순간을 포착했어요! ⭐',
    quiz: '이가 별자리 퀴즈를 발견했어요! 🌟',
    partnership: '이가 특별한 만남을 발견했어요! 💫',
  },
};

function getNotificationMessage(event: CachedEvent): { title: string; body: string } {
  const charType = event.characterName ? getCharTypeFromStorage() : 'explorer';
  const charName = event.characterName ?? '도담';
  const messages = CHARACTER_MESSAGES[charType] ?? CHARACTER_MESSAGES.explorer;
  const suffix = messages[event.category] ?? messages.exploration;

  return {
    title: `📍 ${event.title}`,
    body: `${charName}${suffix}`,
  };
}

function getCharTypeFromStorage(): string {
  try {
    const raw = storage.getString('wherehere-character');
    if (!raw) return 'explorer';
    const parsed = JSON.parse(raw);
    return parsed?.state?.character?.character_type ?? 'pathfinder';
  } catch {
    return 'explorer';
  }
}

function getCharNameFromStorage(): string {
  try {
    const raw = storage.getString('wherehere-character');
    if (!raw) return '도담';
    const parsed = JSON.parse(raw);
    return parsed?.state?.character?.name ?? '도담';
  } catch {
    return '도담';
  }
}

function getCooldownKey(eventId: string): string {
  return `geofence_cooldown_${eventId}`;
}

function isInCooldown(eventId: string): boolean {
  const lastNotified = storage.getNumber(getCooldownKey(eventId));
  if (!lastNotified) return false;
  return Date.now() - lastNotified < COOLDOWN_MS;
}

function markNotified(eventId: string): void {
  storage.set(getCooldownKey(eventId), Date.now());
}

// Background task definition — must be at module top level.
// Guard duplicate registrations to avoid startup fatal errors.
if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Geofence] Task error:', error.message);
    return;
  }

  if (!data) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType !== Location.GeofencingEventType.Enter) return;

  const eventId = region.identifier;
  if (!eventId || isInCooldown(eventId)) return;

  // Retrieve cached event info
  try {
    const raw = storage.getString(`geofence_event_${eventId}`);
    if (!raw) return;

    const event: CachedEvent = JSON.parse(raw);
    event.characterName = getCharNameFromStorage();
    const { title, body } = getNotificationMessage(event);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { eventId: event.id, type: 'geofence_nearby' },
        sound: 'default',
      },
      trigger: null,
    });

    markNotified(eventId);
  } catch (err) {
    console.error('[Geofence] Notification error:', err);
  }
});
}

/**
 * Register nearby events as geofence regions.
 * Call this whenever visible events update (e.g. after fetchNearbyEvents).
 */
export async function registerGeofences(
  events: CachedEvent[],
): Promise<number> {
  // Expo Go는 호스트 앱 Info.plist/백그라운드 위치 조합이 달라 지오펜스 등록이 실패하는 경우가 많음.
  // 실제 기능은 development / production 빌드에서 검증.
  if (Constants.appOwnership === 'expo') {
    return 0;
  }

  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('[Geofence] Background location permission not granted');
      return 0;
    }

    // Stop existing geofences
    const isRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    // Pick closest events (max 20 for iOS)
    const selected = events.slice(0, MAX_GEOFENCE_REGIONS);

    if (selected.length === 0) return 0;

    // Cache event info in MMKV for the background task
    for (const evt of selected) {
      storage.set(`geofence_event_${evt.id}`, JSON.stringify(evt));
    }

    const regions: Location.LocationRegion[] = selected.map((evt) => ({
      identifier: evt.id,
      latitude: evt.lat,
      longitude: evt.lng,
      radius: GEOFENCE_RADIUS_M,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);

    console.log(`[Geofence] Registered ${regions.length} regions`);
    return regions.length;
  } catch (err) {
    console.error('[Geofence] Registration failed:', err);
    return 0;
  }
}

/**
 * Stop all geofence monitoring.
 */
export async function stopGeofences(): Promise<void> {
  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch (err) {
    console.error('[Geofence] Stop failed:', err);
  }
}

/**
 * Check if geofencing is currently active.
 */
export async function isGeofencingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
}
