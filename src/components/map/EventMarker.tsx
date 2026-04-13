import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { EventCategory } from '../../types/enums';
import type { NearbyEvent, GeoPoint } from '../../types';
import { getDistance } from '../../utils/geo';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';
import { COLORS } from '../../config/theme';

interface EventMarkerProps {
  event: NearbyEvent;
  userLocation: GeoPoint | null;
  onPress: (event: NearbyEvent) => void;
}

const MARKER_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  [EventCategory.ACTIVITY]:   { color: '#00D68F', icon: '🏃', label: '탐험' },
  [EventCategory.CULTURE]:    { color: '#48DBFB', icon: '📸', label: '인증' },
  [EventCategory.HIDDEN_GEM]: { color: '#A29BFE', icon: '🧩', label: '퀴즈' },
  [EventCategory.FOOD]:       { color: '#F0C040', icon: '⭐', label: '제휴' },
  [EventCategory.CAFE]:       { color: '#F0C040', icon: '☕', label: '카페' },
  [EventCategory.NATURE]:     { color: '#00D68F', icon: '🌿', label: '자연' },
  [EventCategory.NIGHTLIFE]:  { color: '#A29BFE', icon: '🌙', label: '야간' },
  [EventCategory.SHOPPING]:   { color: '#FF6B6B', icon: '🛍️', label: '쇼핑' },
  [EventCategory.PHOTO]:      { color: '#3B82F6', icon: '📸', label: '포토' },
  [EventCategory.QUIZ]:       { color: '#8B5CF6', icon: '🧩', label: '퀴즈' },
  [EventCategory.PARTNERSHIP]:{ color: '#F59E0B', icon: '🤝', label: '제휴' },
};

function getMarkerConfig(category: string) {
  return MARKER_CONFIG[category] ?? { color: COLORS.primary, icon: '📍', label: '이벤트' };
}

function EventMarkerComponent({ event, userLocation, onPress }: EventMarkerProps) {
  const config = getMarkerConfig(event.category);
  const isExpired = !event.is_active || (event.expires_at != null && new Date(event.expires_at) < new Date());

  const coordinate = { latitude: event.lat, longitude: event.lng };

  const distance = userLocation
    ? getDistance(userLocation, coordinate)
    : Infinity;
  const isInRange = distance <= CHECK_IN_RADIUS_METERS;

  const pulseOpacity = useSharedValue(1);
  /** Fabric + maps legacy interop can crash if Marker children mount/unmount (insertObject index mismatch). */
  const pulseVisible = useSharedValue(0);

  useEffect(() => {
    pulseVisible.value = isInRange && !isExpired ? 1 : 0;
    if (isInRange && !isExpired) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isInRange, isExpired]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseVisible.value ? pulseOpacity.value : 0,
  }));

  const markerColor = isExpired ? '#555B6E' : config.color;
  const markerOpacity = isExpired ? 0.5 : isInRange ? 1 : 0.7;

  return (
    <Marker
      identifier={`event-${event.id}`}
      coordinate={coordinate}
      onPress={() => onPress(event)}
      tracksViewChanges={false}
    >
      <View style={[styles.container, { opacity: markerOpacity }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            { borderColor: markerColor },
            pulseStyle,
          ]}
        />

        <View style={[styles.bubble, { backgroundColor: markerColor }]}>
          <Text style={styles.icon}>
            {isExpired ? '✓' : config.icon}
          </Text>
        </View>

        <View style={[styles.arrow, { borderTopColor: markerColor }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    top: -6,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    fontSize: 18,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export const EventMarker = memo(EventMarkerComponent);
