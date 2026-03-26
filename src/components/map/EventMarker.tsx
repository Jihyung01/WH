import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { EventCategory, EventStatus } from '../../types/enums';
import type { Event, GeoPoint } from '../../types';
import { getDistance } from '../../utils/geo';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';
import { COLORS } from '../../config/theme';

interface EventMarkerProps {
  event: Event;
  userLocation: GeoPoint | null;
  onPress: (event: Event) => void;
}

const MARKER_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  [EventCategory.ACTIVITY]: { color: '#00D68F', icon: '🏃', label: '탐험' },
  [EventCategory.CULTURE]: { color: '#48DBFB', icon: '📸', label: '인증' },
  [EventCategory.HIDDEN_GEM]: { color: '#A29BFE', icon: '🧩', label: '퀴즈' },
  [EventCategory.FOOD]: { color: '#F0C040', icon: '⭐', label: '제휴' },
  [EventCategory.CAFE]: { color: '#F0C040', icon: '☕', label: '카페' },
  [EventCategory.NATURE]: { color: '#00D68F', icon: '🌿', label: '자연' },
  [EventCategory.NIGHTLIFE]: { color: '#A29BFE', icon: '🌙', label: '야간' },
  [EventCategory.SHOPPING]: { color: '#FF6B6B', icon: '🛍️', label: '쇼핑' },
};

function getMarkerConfig(category: EventCategory) {
  return MARKER_CONFIG[category] ?? { color: COLORS.primary, icon: '📍', label: '이벤트' };
}

function EventMarkerComponent({ event, userLocation, onPress }: EventMarkerProps) {
  const config = getMarkerConfig(event.category);
  const isCompleted = event.status === EventStatus.EXPIRED;

  const distance = userLocation
    ? getDistance(userLocation, event.location)
    : Infinity;
  const isInRange = distance <= CHECK_IN_RADIUS_METERS;

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isInRange && !isCompleted) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isInRange, isCompleted]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const markerColor = isCompleted ? '#555B6E' : config.color;
  const markerOpacity = isCompleted ? 0.5 : isInRange ? 1 : 0.7;

  return (
    <Marker
      coordinate={event.location}
      onPress={() => onPress(event)}
      tracksViewChanges={Platform.OS === 'ios'}
    >
      <View style={[styles.container, { opacity: markerOpacity }]}>
        {isInRange && !isCompleted && (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: markerColor },
              pulseStyle,
            ]}
          />
        )}

        <View style={[styles.bubble, { backgroundColor: markerColor }]}>
          <Text style={styles.icon}>
            {isCompleted ? '✓' : config.icon}
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
