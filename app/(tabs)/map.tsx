import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
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
import { HONGDAE_REGION, getDistance } from '../../src/utils/geo';
import { MAP_REFETCH_DISTANCE_M } from '../../src/utils/constants';
import { SPACING, FONT_WEIGHT, SHADOWS, BRAND } from '../../src/config/theme';
import { useTheme } from '../../src/providers/ThemeProvider';
import { EventMarker, UserLocationMarker, EventBottomSheet, GpsBanner } from '../../src/components/map';
import { getMapStyle } from '../../src/components/map/mapStyle';
import type { Event } from '../../src/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

let regionChangeTimer: ReturnType<typeof setTimeout> | null = null;

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { colors, mode } = useTheme();

  const { currentPosition, locationPermission, startTracking, getCurrentPosition } =
    useLocation();
  const {
    visibleEvents,
    selectedEventId,
    isFollowingUser,
    lastFetchCenter,
    selectEvent,
    setFollowingUser,
    fetchNearbyEvents,
    setRegion,
  } = useMapStore();

  const [mapReady, setMapReady] = useState(false);
  const userHeading = useLocationStore((s) => s.heading);

  // ── Initialise location tracking ──
  useEffect(() => {
    (async () => {
      const pos = await getCurrentPosition();
      if (pos) {
        fetchNearbyEvents(pos);
      } else {
        fetchNearbyEvents(HONGDAE_REGION);
      }
      startTracking();
    })();
  }, []);

  // ── Recenter when following user and position changes ──
  useEffect(() => {
    if (isFollowingUser && currentPosition && mapReady) {
      mapRef.current?.animateToRegion(
        {
          ...currentPosition,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500,
      );
    }
  }, [currentPosition, isFollowingUser, mapReady]);

  // ── Selected event object ──
  const selectedEvent = useMemo(
    () => visibleEvents.find((e) => e.id === selectedEventId) ?? null,
    [visibleEvents, selectedEventId],
  );

  // ── Limited & memoised markers (max 50) ──
  const sortedEvents = useMemo(() => {
    if (!currentPosition) return visibleEvents.slice(0, 50);
    return [...visibleEvents]
      .sort(
        (a, b) =>
          getDistance(currentPosition, a.location) -
          getDistance(currentPosition, b.location),
      )
      .slice(0, 50);
  }, [visibleEvents, currentPosition]);

  // ── Region change handler (debounced 300ms) ──
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
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
    [lastFetchCenter],
  );

  // ── Marker press ──
  const onMarkerPress = useCallback(
    (event: Event) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectEvent(event.id);
      setFollowingUser(false);
      mapRef.current?.animateToRegion(
        {
          ...event.location,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        400,
      );
    },
    [],
  );

  // ── Dismiss bottom sheet ──
  const onDismiss = useCallback(() => selectEvent(null), []);

  // ── Challenge button ──
  const onChallenge = useCallback(
    (event: Event) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/event/${event.id}`);
    },
    [],
  );

  // ── Recenter button ──
  const recenterScale = useSharedValue(1);
  const recenterAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recenterScale.value }],
  }));

  const handleRecenter = useCallback(async () => {
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
  }, [currentPosition]);

  const initialRegion = currentPosition
    ? { ...currentPosition, latitudeDelta: 0.008, longitudeDelta: 0.008 }
    : HONGDAE_REGION;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Map ── */}
      <MapView
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
        mapPadding={{ top: 0, right: 0, bottom: 88, left: 0 }}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* User location blue dot */}
        {currentPosition && (
          <UserLocationMarker
            position={currentPosition}
            heading={userHeading}
          />
        )}

        {/* Event markers */}
        {sortedEvents.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            userLocation={currentPosition}
            onPress={onMarkerPress}
          />
        ))}
      </MapView>

      {/* ── GPS Banner ── */}
      <GpsBanner visible={locationPermission === 'denied'} />

      {/* ── Top Left: User avatar ── */}
      <Pressable
        style={styles.avatarBtn}
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
      <View style={styles.topRight}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.surface + 'E0' }]}
          onPress={() => router.push('/settings/notifications')}
          accessibilityLabel="알림 설정"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.surface + 'E0' }]}
          accessibilityLabel="필터"
          accessibilityRole="button"
        >
          <Ionicons name="filter-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* ── Recenter button ── */}
      <AnimatedPressable
        style={[styles.recenterBtn, { backgroundColor: colors.surface + 'E8', borderColor: colors.border }, recenterAnimStyle]}
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
      <EventBottomSheet
        event={selectedEvent}
        userLocation={currentPosition}
        onDismiss={onDismiss}
        onChallenge={onChallenge}
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
    top: 56,
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
    top: 56,
    right: SPACING.lg,
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  recenterBtn: {
    position: 'absolute',
    bottom: 88 + SPACING.lg,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    borderWidth: 1,
  },
});
