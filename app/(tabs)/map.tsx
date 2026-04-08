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
import { SPACING, FONT_WEIGHT, SHADOWS, BRAND } from '../../src/config/theme';
import { useTheme } from '../../src/providers/ThemeProvider';
import { EventMarker, UserLocationMarker, EventBottomSheet, GpsBanner, FriendMarker } from '../../src/components/map';
import {
  ensureFriendLocationPublishingIfNeeded,
  getFriendLocationsSafe,
  subscribeToFriendLocations,
} from '../../src/services/friendLocation';
import type { FriendLocation } from '../../src/services/friendLocation';
import { getFriends } from '../../src/lib/api';
import { getMapStyle } from '../../src/components/map/mapStyle';
import { MapLoadingOverlay } from '../../src/components/ui';
import { registerGeofences } from '../../src/services/geofencing';
import { TutorialOverlay, useTutorial } from '../../src/components/onboarding';
import type { NearbyEvent } from '../../src/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

let regionChangeTimer: ReturnType<typeof setTimeout> | null = null;

const FRIEND_LOCATIONS_POLL_MS = 20_000;

export default function MapScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const mapRef = useRef<MapView>(null);
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarReserve = (Platform.OS === 'ios' ? 52 : 54) + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const overlayTop = insets.top + 8;
  const mapBottomPad = tabBarReserve + SPACING.md;
  const recenterBottom = tabBarReserve + SPACING.lg;

  const { currentPosition, locationPermission, startTracking, getCurrentPosition } =
    useLocation();
  const {
    visibleEvents,
    selectedEventId,
    isFollowingUser,
    isFetchingEvents,
    lastFetchCenter,
    selectEvent,
    setFollowingUser,
    fetchNearbyEvents,
    setRegion,
  } = useMapStore();

  const { showTutorial, completeTutorial } = useTutorial();
  const [mapReady, setMapReady] = useState(false);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const userHeading = useLocationStore((s) => s.heading);
  const bgLocationEnabled = useNotificationStore((s) => s.backgroundLocationEnabled);

  // ── Initialise location tracking ──
  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      const pos = await getCurrentPosition();
      if (pos) {
        fetchNearbyEvents(pos);
      } else {
        fetchNearbyEvents(HONGDAE_REGION);
      }
      startTracking();
    })();
  }, [isFocused]);

  // ── Load friend locations ──
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function initFriendLocations() {
      if (!isFocused) return;
      try {
        await ensureFriendLocationPublishingIfNeeded();

        const { friends } = await getFriends();
        if (friends.length === 0) {
          setFriendLocations([]);
          return;
        }

        const locations = await getFriendLocationsSafe();
        if (locations !== null) setFriendLocations(locations);

        const friendIds = friends.map((f) => f.user_id);
        unsubscribe = subscribeToFriendLocations(friendIds, (next) => {
          setFriendLocations(next);
        });

        pollId = setInterval(async () => {
          if (!isFocused) return;
          const next = await getFriendLocationsSafe();
          if (next !== null) setFriendLocations(next);
        }, FRIEND_LOCATIONS_POLL_MS);
      } catch {}
    }

    initFriendLocations();

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollId) clearInterval(pollId);
    };
  }, [isFocused]);

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
    },
    [lastFetchCenter, isFocused],
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

  const initialRegion = currentPosition
    ? { ...currentPosition, latitudeDelta: 0.008, longitudeDelta: 0.008 }
    : HONGDAE_REGION;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Map with Clustering ── */}
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={getMapStyle(mode)}
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
      >
        {/* User location blue dot */}
        {isFocused && currentPosition && (
          <UserLocationMarker
            position={currentPosition}
            heading={userHeading}
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
        {isFocused && friendLocations.map((friend) => (
          <FriendMarker key={friend.user_id} friend={friend} />
        ))}
      </ClusteredMapView>

      {/* ── GPS Banner ── */}
      <GpsBanner visible={locationPermission === 'denied'} />

      {/* ── Loading overlay ── */}
      {isFetchingEvents && visibleEvents.length === 0 && <MapLoadingOverlay />}

      {/* ── Top Left: User avatar ── */}
      <Pressable
        style={[styles.avatarBtn, { top: overlayTop }]}
        onPress={() => router.push('/(tabs)/profile')}
        accessibilityLabel="프로필 화면으로 이동"
        accessibilityRole="button"
      >
        <View style={[styles.avatarCircle, { backgroundColor: colors.surface, borderColor: BRAND.primary }]}>
          <Text style={styles.avatarEmoji}>🧑‍🚀</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: BRAND.primary, borderColor: colors.surface }]}>
          <Text style={[styles.levelText, { color: '#FFFFFF' }]}>1</Text>
        </View>
      </Pressable>

      {/* ── Top Right: Actions ── */}
      <View style={[styles.topRight, { top: overlayTop }]}>
        <Pressable
          style={[
            styles.iconBtn,
            Platform.OS === 'android' && styles.iconBtnAndroid,
            { backgroundColor: colors.surface + 'E0' },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/social');
          }}
          accessibilityLabel="소셜 · 친구 위치"
          accessibilityRole="button"
        >
          <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={[
            styles.iconBtn,
            Platform.OS === 'android' && styles.iconBtnAndroid,
            { backgroundColor: colors.surface + 'E0' },
          ]}
          onPress={() => router.push('/settings/notifications')}
          accessibilityLabel="알림 설정"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={[
            styles.iconBtn,
            styles.iconBtnLast,
            Platform.OS === 'android' && styles.iconBtnAndroid,
            { backgroundColor: colors.surface + 'E0' },
          ]}
          accessibilityLabel="필터"
          accessibilityRole="button"
        >
          <Ionicons name="filter-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* ── Recenter button ── */}
      <AnimatedPressable
        style={[
          styles.recenterBtn,
          { bottom: recenterBottom, backgroundColor: colors.surface + 'E8', borderColor: colors.border },
          Platform.OS === 'android' && styles.recenterBtnAndroid,
          recenterAnimStyle,
        ]}
        onPress={handleRecenter}
        accessibilityLabel="현재 위치로 이동"
        accessibilityRole="button"
      >
        <Ionicons
          name={isFollowingUser ? 'navigate' : 'navigate-outline'}
          size={22}
          color={isFollowingUser ? BRAND.primary : colors.textPrimary}
        />
      </AnimatedPressable>

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
  avatarEmoji: {
    fontSize: 22,
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
});
