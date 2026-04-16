import React, { memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
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
import { getConditionalEventTag } from '../../services/weather';
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

const IS_ANDROID = Platform.OS === 'android';

/** Android MapView often under-measures custom Marker children; explicit box + one tracksViewChanges pass fixes clipping. */
const MARKER_LAYOUT = IS_ANDROID
  ? {
      containerWidth: 72,
      minHeight: 78,
      markerBody: 60,
      bubble: 44,
      pulseRing: 56,
      iconSize: 20,
      paddingBottom: 10,
      arrowTop: 9,
      arrowSide: 7,
    }
  : {
      containerWidth: 64,
      minHeight: 72,
      markerBody: 56,
      bubble: 40,
      pulseRing: 52,
      iconSize: 18,
      paddingBottom: 4,
      arrowTop: 8,
      arrowSide: 6,
    };

function EventMarkerComponent({ event, userLocation, onPress }: EventMarkerProps) {
  const config = getMarkerConfig(event.category);
  const conditionalLabel =
    event.visibility_conditions != null ? getConditionalEventTag(event.visibility_conditions) : null;
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

  const markerColor = isExpired ? '#555B6E' : conditionalLabel ? '#7C3AED' : config.color;
  const markerOpacity = isExpired ? 0.5 : isInRange ? 1 : 0.7;

  const containerMinHeight =
    MARKER_LAYOUT.minHeight +
    (conditionalLabel && !isExpired ? (IS_ANDROID ? 22 : 18) : 0);

  const [tracksViewChanges, setTracksViewChanges] = useState(IS_ANDROID);

  useEffect(() => {
    if (!IS_ANDROID) return;
    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setTracksViewChanges(false);
    });
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  return (
    <Marker
      identifier={`event-${event.id}`}
      coordinate={coordinate}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={[
          styles.container,
          {
            opacity: markerOpacity,
            width: MARKER_LAYOUT.containerWidth,
            minHeight: containerMinHeight,
            paddingBottom: MARKER_LAYOUT.paddingBottom,
          },
        ]}
        collapsable={false}
      >
        <View
          style={[
            styles.markerBody,
            { width: MARKER_LAYOUT.markerBody, height: MARKER_LAYOUT.markerBody },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                width: MARKER_LAYOUT.pulseRing,
                height: MARKER_LAYOUT.pulseRing,
                borderRadius: MARKER_LAYOUT.pulseRing / 2,
                borderColor: markerColor,
              },
              pulseStyle,
            ]}
          />

          <View
            style={[
              styles.bubble,
              {
                backgroundColor: markerColor,
                width: MARKER_LAYOUT.bubble,
                height: MARKER_LAYOUT.bubble,
                borderRadius: MARKER_LAYOUT.bubble / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.icon,
                { fontSize: MARKER_LAYOUT.iconSize },
                IS_ANDROID && styles.iconAndroid,
              ]}
            >
              {isExpired ? '✓' : config.icon}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.arrow,
            {
              borderTopColor: markerColor,
              borderLeftWidth: MARKER_LAYOUT.arrowSide,
              borderRightWidth: MARKER_LAYOUT.arrowSide,
              borderTopWidth: MARKER_LAYOUT.arrowTop,
            },
          ]}
        />

        {conditionalLabel && !isExpired ? (
          <View style={styles.tagWrap}>
            <Text style={styles.tagText} numberOfLines={1}>
              {conditionalLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'visible',
  },
  markerBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  bubble: {
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
    textAlign: 'center',
  },
  iconAndroid: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tagWrap: {
    marginTop: 2,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5F3FF',
    textAlign: 'center',
    ...(IS_ANDROID ? { includeFontPadding: false } : {}),
  },
});

export const EventMarker = memo(EventMarkerComponent);
