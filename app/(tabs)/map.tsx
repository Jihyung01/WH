import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import ClusteredMapView from 'react-native-map-clustering';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useLocation } from '../../src/hooks/useLocation';
import { useMapStore } from '../../src/stores/mapStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { HONGDAE_REGION, getDistance } from '../../src/utils/geo';
import { MAP_REFETCH_DISTANCE_M } from '../../src/utils/constants';
import { SPACING, FONT_WEIGHT, SHADOWS, BRAND, MANGA, FONT_FAMILY } from '../../src/config/theme';
import { useTheme } from '../../src/providers/ThemeProvider';
import {
  EventMarker,
  UserLocationMarker,
  EventBottomSheet,
  FriendMarker,
  CharacterBubble,
  MapClusterMarker,
  MapSearchBar,
  MapWeatherChip,
  MapFabStack,
  NearbyPlacesCarousel,
  PowEffect,
  type NearbyPlace,
  type PowEffectHandle,
  type WeatherCondition as MangaWeatherCondition,
} from '../../src/components/map';
import {
  CreateMarkSheet,
  MarkMarker,
  type CreateMarkSheetHandle,
} from '../../src/components/mark';
import { useMarkStore } from '../../src/stores/markStore';
import type { Mark } from '../../src/types/models';
import {
  ensureFriendLocationPublishingIfNeeded,
  getFriendLocationsSafe,
  subscribeToFriendLocations,
} from '../../src/services/friendLocation';
import type { FriendLocation } from '../../src/services/friendLocation';
import { getFriends, getStreakInfo } from '../../src/lib/api';
import DailyRewardModal from '../../src/components/rewards/DailyRewardModal';
import { getMapStyle } from '../../src/components/map/mapStyle';
import { registerGeofences } from '../../src/services/geofencing';
import { TutorialOverlay, useTutorial } from '../../src/components/onboarding';
import type { NearbyEvent } from '../../src/types';
import { useAuthStore } from '../../src/stores/authStore';
import { useCharacterStore } from '../../src/stores/characterStore';
import { useWeatherStore } from '../../src/stores/weatherStore';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

let regionChangeTimer: ReturnType<typeof setTimeout> | null = null;
let markRegionChangeTimer: ReturnType<typeof setTimeout> | null = null;

const FRIEND_LOCATIONS_POLL_MS = Platform.OS === 'android' ? 7_000 : 15_000;
const FRIEND_LOCATION_STALE_KEEP_MS = 12 * 60 * 60 * 1000; // keep missing friends for up to 12h to avoid flicker
const MAP_BOOT_TIMEOUT_MS = 6000;
const MARK_REFETCH_DEBOUNCE_MS = 2200;
const MARK_REFETCH_DISTANCE_M = 650;
const MARK_CALLOUT_HOLD_MS = 8000;

function mergeFriendLocations(
  prev: FriendLocation[],
  next: FriendLocation[],
): FriendLocation[] {
  const now = Date.now();
  const byId = new Map<string, FriendLocation>();

  // Start with latest payload.
  for (const friend of next) {
    byId.set(friend.user_id, friend);
  }

  // Keep previously known friends for a grace period if they are temporarily missing.
  for (const friend of prev) {
    if (byId.has(friend.user_id)) continue;
    const seenAt = new Date(friend.last_seen_at).getTime();
    if (Number.isFinite(seenAt) && now - seenAt <= FRIEND_LOCATION_STALE_KEEP_MS) {
      byId.set(friend.user_id, friend);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.user_id.localeCompare(b.user_id));
}

function areFriendLocationsEqual(a: FriendLocation[], b: FriendLocation[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(a.map((f) => [f.user_id, f]));
  for (const next of b) {
    const prev = byId.get(next.user_id);
    if (!prev) return false;
    if (
      prev.latitude !== next.latitude ||
      prev.longitude !== next.longitude ||
      prev.last_seen_at !== next.last_seen_at ||
      prev.username !== next.username ||
      prev.character_type !== next.character_type ||
      prev.level !== next.level
    ) {
      return false;
    }
  }
  return true;
}

export default function MapScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const mapRef = useRef<MapView>(null);
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const mapCharacter = useCharacterStore((s) => s.character);

  const tabBarReserve = (Platform.OS === 'ios' ? 52 : 54) + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const overlayTop = insets.top + 8;
  const mapBottomPad = tabBarReserve + SPACING.md;
  const recenterBottom = tabBarReserve + SPACING.lg;

  const { currentPosition, startTracking, getCurrentPosition } =
    useLocation();
  /** Per-field selectors so `setRegion` / other map state does not re-render the whole screen on every pan. */
  const visibleEvents = useMapStore((s) => s.visibleEvents);
  const selectedEventId = useMapStore((s) => s.selectedEventId);
  const isFollowingUser = useMapStore((s) => s.isFollowingUser);
  const lastFetchCenter = useMapStore((s) => s.lastFetchCenter);
  const selectEvent = useMapStore((s) => s.selectEvent);
  const setFollowingUser = useMapStore((s) => s.setFollowingUser);
  const fetchNearbyEvents = useMapStore((s) => s.fetchNearbyEvents);
  const applyWeatherToBufferedEvents = useMapStore((s) => s.applyWeatherToBufferedEvents);
  const setRegion = useMapStore((s) => s.setRegion);
  const fetchWeather = useWeatherStore((s) => s.fetchWeather);

  const { showTutorial, completeTutorial } = useTutorial();
  const [mapReady, setMapReady] = useState(false);
  const [dailyRewardModalVisible, setDailyRewardModalVisible] = useState(false);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const userHeading = useLocationStore((s) => s.heading);
  const bgLocationEnabled = useNotificationStore((s) => s.backgroundLocationEnabled);

  /** Mark (흔적) 관련 상태 */
  const createMarkSheetRef = useRef<CreateMarkSheetHandle>(null);
  const lastMarkFetchCenterRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const holdMarkRefetchUntilRef = useRef(0);
  const nearbyMarks = useMarkStore((s) => s.nearbyMarks);
  const loadNearbyMarks = useMarkStore((s) => s.loadNearbyMarks);

  // ── Phase 2 manga overlays ──
  /** POW 효과 ref (장소 발견 / 챌린지 클리어 시 발화) */
  const powRef = useRef<PowEffectHandle>(null);
  /** 알림 미확인 카운트 (실제로 알림 시스템에서 가져와야 함 — placeholder) */
  const unreadCount = useNotificationStore(
    (s) => (s as { unreadCount?: number }).unreadCount ?? 0,
  );
  /** weatherStore 의 condition 을 manga chip 의 단순 enum 으로 매핑 */
  const currentWeather = useWeatherStore((s) => s.currentWeather);
  const weatherTemperatureC = useWeatherStore((s) => s.temperature);
  const mangaWeatherCondition: MangaWeatherCondition = useMemo(() => {
    switch (currentWeather) {
      case 'clear':
        return 'sunny';
      case 'clouds':
        return 'cloudy';
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'rainy';
      case 'snow':
        return 'snowy';
      default:
        return 'unknown';
    }
  }, [currentWeather]);

  // ── Initialise location tracking ──
  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      let pos = currentPosition;
      if (!pos) {
        pos = await Promise.race([
          getCurrentPosition(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), MAP_BOOT_TIMEOUT_MS)),
        ]);
      }
      const seed = pos ?? HONGDAE_REGION;
      setInitialRegion({
        latitude: seed.latitude,
        longitude: seed.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      fetchNearbyEvents(seed);
      lastMarkFetchCenterRef.current = {
        latitude: seed.latitude,
        longitude: seed.longitude,
      };
      void loadNearbyMarks(seed.latitude, seed.longitude);
      void fetchWeather(seed.latitude, seed.longitude);
      startTracking();
    })();
  }, [isFocused, fetchWeather]);

  useEffect(() => {
    return () => {
      if (regionChangeTimer) clearTimeout(regionChangeTimer);
      if (markRegionChangeTimer) clearTimeout(markRegionChangeTimer);
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !currentPosition) return;
    void fetchWeather(currentPosition.latitude, currentPosition.longitude);
  }, [isFocused, currentPosition?.latitude, currentPosition?.longitude, fetchWeather]);

  useEffect(() => {
    return useWeatherStore.subscribe((state, prev) => {
      if (
        state.currentWeather !== prev.currentWeather ||
        state.weatherDataAvailable !== prev.weatherDataAvailable ||
        state.lastFetched !== prev.lastFetched
      ) {
        applyWeatherToBufferedEvents();
      }
    });
  }, [applyWeatherToBufferedEvents]);

  // ── Daily reward modal (OTA-friendly; coins/XP handled by claim_daily_reward RPC) ──
  useEffect(() => {
    if (!isFocused || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const info = await getStreakInfo();
        if (cancelled) return;
        if (!info.claimed_today) {
          setDailyRewardModalVisible(true);
        }
      } catch {
        /* offline / RPC — skip modal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, userId]);

  // ── Load friend locations ──
  useEffect(() => {
    if (!isFocused || !userId) {
      return;
    }

    let cancelled = false;
    const unsubRef: { current: (() => void) | null } = { current: null };
    let pollId: ReturnType<typeof setInterval> | null = null;
    const uid = userId;

    async function initFriendLocations() {
      try {
        await ensureFriendLocationPublishingIfNeeded();
        if (cancelled) return;

        const { friends } = await getFriends();
        if (cancelled) return;

        if (friends.length === 0) {
          setFriendLocations([]);
          return;
        }

        const locations = await getFriendLocationsSafe(uid);
        if (cancelled) return;
        if (locations !== null) {
          setFriendLocations((prev) => {
            const merged = mergeFriendLocations(prev, locations);
            return areFriendLocationsEqual(prev, merged) ? prev : merged;
          });
        }

        if (cancelled) return;
        const friendIds = friends.map((f) => f.user_id);
        unsubRef.current = subscribeToFriendLocations(friendIds, uid, (next) => {
          if (cancelled) return;
          setFriendLocations((prev) => {
            const merged = mergeFriendLocations(prev, next);
            return areFriendLocationsEqual(prev, merged) ? prev : merged;
          });
        });

        pollId = setInterval(() => {
          if (cancelled) return;
          void (async () => {
            const next = await getFriendLocationsSafe(uid);
            if (cancelled || next === null) return;
            setFriendLocations((prev) => {
              const merged = mergeFriendLocations(prev, next);
              return areFriendLocationsEqual(prev, merged) ? prev : merged;
            });
          })();
        }, FRIEND_LOCATIONS_POLL_MS);
      } catch (e) {
        if (!cancelled) console.warn('[map] initFriendLocations failed:', e);
      }
    }

    void initFriendLocations();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
      if (pollId) clearInterval(pollId);
    };
  }, [isFocused, userId]);

  // ── Register geofences when events update ──
  useEffect(() => {
    if (!isFocused) return;
    if (visibleEvents.length > 0 && bgLocationEnabled) {
      const geofenceData = visibleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        lat: e.lat,
        lng: e.lng,
        category: e.category,
      }));
      registerGeofences(geofenceData).catch(() => {});
    }
  }, [visibleEvents, bgLocationEnabled, isFocused]);

  // ── Recenter when following user and position changes ──
  useEffect(() => {
    if (isFocused && isFollowingUser && currentPosition && mapReady) {
      mapRef.current?.animateToRegion(
        {
          ...currentPosition,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500,
      );
    }
  }, [currentPosition, isFollowingUser, mapReady, isFocused]);

  // ── Selected event object ──
  const selectedEvent = useMemo(
    () => (isFocused ? visibleEvents.find((e) => e.id === selectedEventId) ?? null : null),
    [visibleEvents, selectedEventId, isFocused],
  );

  // ── Limited & memoised markers (max 50) ──
  const sortedEvents = useMemo(() => {
    if (!isFocused) return [];
    if (!currentPosition) return visibleEvents.slice(0, 50);
    return [...visibleEvents]
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, 50);
  }, [visibleEvents, currentPosition, isFocused]);

  /** Phase 2 — 하단 carousel 용 가까운 3개 장소 (이벤트에서 derive) */
  const nearbyPlaces = useMemo<NearbyPlace[]>(() => {
    return sortedEvents.slice(0, 3).map((ev, idx) => {
      const cat = (ev as { category?: string }).category;
      const emoji =
        cat === 'food' ? '🍽️' :
        cat === 'cafe' ? '☕' :
        cat === 'nature' ? '🌳' :
        cat === 'culture' ? '🎨' :
        cat === 'photo' ? '📸' :
        cat === 'nightlife' ? '🌙' :
        cat === 'shopping' ? '🛍️' :
        '📍';
      const distM = (ev as { distance_meters?: number }).distance_meters ?? 0;
      const badge: NearbyPlace['badge'] =
        idx === 0 && distM < 200 ? 'HOT' :
        (ev as { created_at?: string }).created_at && Date.now() - new Date((ev as { created_at?: string }).created_at!).getTime() < 24 * 60 * 60 * 1000 ? 'NEW' :
        null;
      return {
        id: String(ev.id),
        emoji,
        title: (ev as { title?: string }).title ?? '이름 없는 장소',
        subtitle: (ev as { description?: string; mission_title?: string }).description ?? (ev as { mission_title?: string }).mission_title ?? undefined,
        distanceM: distM,
        badge,
      };
    });
  }, [sortedEvents]);

  /** Stable element list so GPS / unrelated renders do not rebuild ClusteredMapView children for friends. */
  const friendMarkerNodes = useMemo(
    () =>
      friendLocations.map((friend) => (
        <FriendMarker key={friend.user_id} friend={friend} />
      )),
    [friendLocations],
  );

  // ── Region change handler (debounced 300ms) ──
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      if (!isFocused) return;
      setRegion(region);
      setFollowingUser(false);

      if (regionChangeTimer) clearTimeout(regionChangeTimer);
      regionChangeTimer = setTimeout(() => {
        const center = { latitude: region.latitude, longitude: region.longitude };
        if (
          !lastFetchCenter ||
          getDistance(center, lastFetchCenter) > MAP_REFETCH_DISTANCE_M
        ) {
          fetchNearbyEvents(center);
        }
      }, 300);

      if (markRegionChangeTimer) clearTimeout(markRegionChangeTimer);
      markRegionChangeTimer = setTimeout(() => {
        if (Date.now() < holdMarkRefetchUntilRef.current) return;
        const center = { latitude: region.latitude, longitude: region.longitude };
        if (
          !lastMarkFetchCenterRef.current ||
          getDistance(center, lastMarkFetchCenterRef.current) > MARK_REFETCH_DISTANCE_M
        ) {
          lastMarkFetchCenterRef.current = center;
          void loadNearbyMarks(region.latitude, region.longitude);
        }
      }, MARK_REFETCH_DEBOUNCE_MS);
    },
    [lastFetchCenter, isFocused, loadNearbyMarks],
  );

  // ── Marker press ──
  const onMarkerPress = useCallback(
    (event: NearbyEvent) => {
      if (!isFocused) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectEvent(event.id);
      setFollowingUser(false);
      mapRef.current?.animateToRegion(
        {
          latitude: event.lat,
          longitude: event.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        400,
      );
    },
    [isFocused],
  );

  // ── Dismiss bottom sheet ──
  const onDismiss = useCallback(() => selectEvent(null), []);

  // ── Challenge button ──
  const onChallenge = useCallback(
    (event: NearbyEvent) => {
      if (!isFocused) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/event/${event.id}`);
    },
    [isFocused],
  );

  // ── Recenter button ──
  const recenterScale = useSharedValue(1);
  const recenterAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recenterScale.value }],
  }));

  const handleRecenter = useCallback(async () => {
    if (!isFocused) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    recenterScale.value = withSpring(0.9, {}, () => {
      recenterScale.value = withSpring(1);
    });
    setFollowingUser(true);
    const pos = currentPosition ?? (await getCurrentPosition());
    if (pos) {
      mapRef.current?.animateToRegion(
        { ...pos, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        500,
      );
    }
  }, [currentPosition, isFocused]);

  const handleMarkPress = useCallback(() => {
    holdMarkRefetchUntilRef.current = Date.now() + MARK_CALLOUT_HOLD_MS;
  }, []);

  const handleMarkCalloutPress = useCallback((_: Mark) => {
    holdMarkRefetchUntilRef.current = Date.now() + MARK_CALLOUT_HOLD_MS;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/explore');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Map with Clustering ── */}
      {!initialRegion ? null : (
        <ClusteredMapView
          ref={mapRef}
          style={styles.map}
          removeClippedSubviews={false}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={getMapStyle('manga')}
          initialRegion={initialRegion}
          onRegionChangeComplete={onRegionChangeComplete}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          mapPadding={{ top: 0, right: 0, bottom: mapBottomPad, left: 0 }}
          rotateEnabled={false}
          pitchEnabled={false}
          clusterColor={BRAND.primary}
          clusterTextColor="#FFF"
          clusterFontFamily={undefined}
          radius={60}
          maxZoom={16}
          minPoints={3}
          extent={256}
          animationEnabled={false}
          renderCluster={(cluster) => (
            <MapClusterMarker
              key={`cluster-${cluster.id}`}
              id={cluster.id}
              geometry={cluster.geometry}
              properties={cluster.properties}
              onPress={cluster.onPress}
              clusterColor={cluster.clusterColor}
              clusterTextColor={cluster.clusterTextColor}
              clusterFontFamily={cluster.clusterFontFamily}
            />
          )}
        >
          {/* User location blue dot */}
          {isFocused && currentPosition && (
            <UserLocationMarker
              position={currentPosition}
              heading={userHeading}
              characterType={mapCharacter?.character_type}
              characterLevel={mapCharacter?.level}
              favoriteDistrict={mapCharacter?.favorite_district ?? null}
            />
          )}

          {/* Event markers */}
          {isFocused && sortedEvents.map((event) => (
            <EventMarker
              key={event.id}
              event={event}
              userLocation={currentPosition}
              onPress={onMarkerPress}
            />
          ))}

          {/* Friend location markers */}
          {isFocused && friendMarkerNodes}

          {/* Mark (흔적) markers */}
          {isFocused &&
            nearbyMarks.map((mark: Mark) => (
              <MarkMarker
                key={`mark-${mark.id}`}
                mark={mark}
                onPress={handleMarkPress}
                onCalloutPress={handleMarkCalloutPress}
              />
            ))}
        </ClusteredMapView>
      )}

      {isFocused && mapCharacter ? (
        <CharacterBubble
          situation="app_open"
          preferEnvironmentalLine
          topOffset={overlayTop + 52}
        />
      ) : null}

      {/* (avatar btn 제거 — manga 디자인엔 없음. 프로필 진입은 탭바로) */}

      {/* ── 상단: 만화 톤 검색바 + 알림 종 (Phase 2) ── */}
      <View
        style={{
          position: 'absolute',
          top: overlayTop,
          left: SPACING.lg,
          right: SPACING.lg,
          zIndex: 200,
        }}
      >
        <MapSearchBar
          placeholder="오늘 어디로?!"
          unreadCount={unreadCount}
          onBellPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings/notifications');
          }}
        />
      </View>

      {/* ── 좌상단 날씨 chip (Phase 2) ── */}
      <View
        style={{
          position: 'absolute',
          top: overlayTop + 56,
          left: SPACING.lg,
          zIndex: 200,
        }}
      >
        <MapWeatherChip
          condition={mangaWeatherCondition}
          temperatureC={weatherTemperatureC}
        />
      </View>

      {/* ── 우측 FAB 스택: 레이어/이벤트/흔적/내위치 (Phase 2) ── */}
      <View
        style={{
          position: 'absolute',
          right: SPACING.lg,
          bottom: recenterBottom,
          zIndex: 250,
        }}
      >
        <MapFabStack
          onLayerPress={() => {
            // TODO Phase 2.5: 카테고리 필터 sheet 오픈
          }}
          onCreateEventPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/create-event');
          }}
          onCreateTracePress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            createMarkSheetRef.current?.open();
          }}
          onLocationPress={handleRecenter}
        />
      </View>

      {/* ── 하단 근처 탐험지 carousel (Phase 2) ── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: recenterBottom - 8,
          zIndex: 100,
        }}
        pointerEvents="box-none"
      >
        <NearbyPlacesCarousel
          title="근처 탐험지"
          count={nearbyPlaces.length}
          places={nearbyPlaces}
          onPlacePress={(p) => {
            const ev = sortedEvents.find((e) => e.id === p.id);
            if (ev) onMarkerPress(ev);
          }}
        />
      </View>

      {/* ── 만화 효과음 오버레이 (Phase 2) ── */}
      <PowEffect ref={powRef} />

      {/* ── Bottom Sheet ── */}
      {isFocused && (
        <EventBottomSheet
          event={selectedEvent}
          userLocation={currentPosition}
          onDismiss={onDismiss}
          onChallenge={onChallenge}
        />
      )}

      {/* ── Onboarding Tutorial ── */}
      <TutorialOverlay
        visible={showTutorial}
        onComplete={completeTutorial}
        onSkip={completeTutorial}
      />

      <DailyRewardModal
        visible={dailyRewardModalVisible}
        onClose={() => setDailyRewardModalVisible(false)}
      />

      {/* ── 흔적 남기기 BottomSheet ── */}
      <CreateMarkSheet
        ref={createMarkSheetRef}
        coords={
          currentPosition
            ? { latitude: currentPosition.latitude, longitude: currentPosition.longitude }
            : null
        }
        district={mapCharacter?.favorite_district ?? null}
        onCreated={(result) => {
          if (currentPosition) {
            lastMarkFetchCenterRef.current = {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            };
            void loadNearbyMarks(currentPosition.latitude, currentPosition.longitude);
          } else if (result.mark) {
            lastMarkFetchCenterRef.current = {
              latitude: result.mark.location.lat,
              longitude: result.mark.location.lng,
            };
            void loadNearbyMarks(result.mark.location.lat, result.mark.location.lng);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  avatarBtn: {
    position: 'absolute',
    left: SPACING.lg,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...SHADOWS.md,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },

  topRight: {
    position: 'absolute',
    right: SPACING.lg,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  iconBtnLast: {
    marginBottom: 0,
  },
  iconBtnAndroid: {
    elevation: 6,
  },

  recenterBtn: {
    position: 'absolute',
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    borderWidth: 1,
  },
  recenterBtnAndroid: {
    elevation: 8,
  },
  markFab: {
    position: 'absolute',
    right: SPACING.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  markFabAndroid: {
    elevation: 10,
  },
});
