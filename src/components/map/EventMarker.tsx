import React, { memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

type IonName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Each entry keeps the legacy Ionicons name (used on iOS where bitmap capture
 * handles icon fonts reliably) **and** an emoji fallback. Android rasterises
 * the custom marker into a bitmap, and icon-font glyphs are often not loaded
 * at capture time → broken glyphs. The system emoji font is always available,
 * so emojis round-trip through the bitmap cleanly.
 */
const MARKER_CONFIG: Record<string, { color: string; ion: IonName; emoji: string; label: string }> = {
  /** 레거시/별칭 */
  activity:                         { color: '#00D68F', ion: 'navigate-outline',      emoji: '🧭', label: '탐험' },
  [EventCategory.EXPLORATION]:      { color: '#00D68F', ion: 'navigate-outline',      emoji: '🧭', label: '탐험' },
  [EventCategory.CULTURE]:          { color: '#48DBFB', ion: 'camera-outline',        emoji: '🎨', label: '인증' },
  [EventCategory.HIDDEN_GEM]:       { color: '#A29BFE', ion: 'sparkles-outline',      emoji: '✨', label: '히든' },
  [EventCategory.FOOD]:             { color: '#F0C040', ion: 'restaurant-outline',    emoji: '🍽️', label: '맛집' },
  [EventCategory.CAFE]:             { color: '#F0C040', ion: 'cafe-outline',          emoji: '☕', label: '카페' },
  [EventCategory.NATURE]:           { color: '#00D68F', ion: 'leaf-outline',          emoji: '🌿', label: '자연' },
  [EventCategory.NIGHTLIFE]:        { color: '#A29BFE', ion: 'moon-outline',          emoji: '🌙', label: '야간' },
  [EventCategory.SHOPPING]:         { color: '#FF6B6B', ion: 'bag-outline',           emoji: '🛍️', label: '쇼핑' },
  [EventCategory.PHOTO]:            { color: '#3B82F6', ion: 'image-outline',         emoji: '📸', label: '포토' },
  [EventCategory.QUIZ]:             { color: '#8B5CF6', ion: 'help-circle-outline',   emoji: '❓', label: '퀴즈' },
  [EventCategory.PARTNERSHIP]:      { color: '#F59E0B', ion: 'people-outline',        emoji: '🤝', label: '제휴' },
};

function getMarkerConfig(category: string): {
  color: string;
  ion: IonName;
  emoji: string;
  label: string;
} {
  return MARKER_CONFIG[category] ?? { color: COLORS.primary, ion: 'location-outline', emoji: '📍', label: '이벤트' };
}

const IS_ANDROID = Platform.OS === 'android';

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
  const pulseVisible = useSharedValue(0);

  useEffect(() => {
    if (IS_ANDROID) return; // Android uses static view path — no Reanimated in bitmap.
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

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    InteractionManager.runAfterInteractions(() => {
      // Android: emoji는 system font라 즉시 렌더되지만, 첫 레이아웃 커밋 이후 스냅샷해야 함.
      const delayMs = IS_ANDROID ? 350 : 160;
      timer = setTimeout(() => {
        if (!cancelled) setTracksViewChanges(false);
      }, delayMs);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [event.id, isInRange, isExpired, conditionalLabel]);

  // -------------------------------------------------------------------------
  // Android: dramatically simplified layout. No position:absolute, no
  // Reanimated, no dynamic height. Just a centered bubble with an emoji
  // (system emoji font is always loaded → survives bitmap capture). The
  // optional tag renders as a separate inline Text below the circle so that
  // its baseline doesn't reshape the bitmap.
  // -------------------------------------------------------------------------
  if (IS_ANDROID) {
    return (
      <Marker
        identifier={`event-${event.id}`}
        coordinate={coordinate}
        onPress={() => onPress(event)}
        tracksViewChanges={tracksViewChanges}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.androidContainer} collapsable={false}>
          <View
            style={[
              styles.androidBubble,
              {
                backgroundColor: markerColor,
                opacity: markerOpacity,
                borderColor: isInRange && !isExpired ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
              },
            ]}
          >
            <Text style={styles.androidEmoji} allowFontScaling={false}>
              {isExpired ? '✅' : config.emoji}
            </Text>
          </View>
          {conditionalLabel && !isExpired ? (
            <View style={styles.androidTag} collapsable={false}>
              <Text style={styles.androidTagText} allowFontScaling={false} numberOfLines={1}>
                {conditionalLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </Marker>
    );
  }

  // -------------------------------------------------------------------------
  // iOS: keep the rich pulse-ring + Ionicons path. Works reliably under UIKit
  // snapshot; Ionicons fonts are loaded by the time snapshot happens.
  // -------------------------------------------------------------------------
  const iosBubble = 40;
  const iosPulse = 52;
  const iosBody = 56;
  const pulseTop = (iosBody - iosPulse) / 2;

  return (
    <Marker
      identifier={`event-${event.id}`}
      coordinate={coordinate}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={[
          styles.iosContainer,
          { opacity: markerOpacity },
        ]}
      >
        <View style={[styles.iosBody, { width: iosBody, height: iosBody }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.iosPulse,
              {
                top: pulseTop,
                left: pulseTop,
                width: iosPulse,
                height: iosPulse,
                borderRadius: iosPulse / 2,
                borderColor: markerColor,
              },
              pulseStyle,
            ]}
          />
          <View
            style={[
              styles.iosBubble,
              {
                backgroundColor: markerColor,
                width: iosBubble,
                height: iosBubble,
                borderRadius: iosBubble / 2,
              },
            ]}
          >
            <Ionicons
              name={isExpired ? 'checkmark' : config.ion}
              size={18}
              color="#FFFFFF"
              allowFontScaling={false}
            />
          </View>
        </View>

        <View
          style={[
            styles.iosArrow,
            { borderTopColor: markerColor },
          ]}
        />

        {conditionalLabel && !isExpired ? (
          <View style={styles.iosTag}>
            <Text style={styles.iosTagText} numberOfLines={1}>
              {conditionalLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  // ---- Android (bitmap-safe) ----
  androidContainer: {
    // 고정 폭. width/height 동적 변동 없어야 Android Marker bitmap이 잘리지 않음.
    width: 96,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  androidBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidEmoji: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: '#FFFFFF',
  },
  androidTag: {
    marginTop: 4,
    maxWidth: 92,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  androidTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5F3FF',
    textAlign: 'center',
    includeFontPadding: false,
  },

  // ---- iOS (rich animated) ----
  iosContainer: {
    alignItems: 'center',
    overflow: 'visible',
    minHeight: 72,
    width: 64,
    paddingBottom: 4,
  },
  iosBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosPulse: {
    position: 'absolute',
    borderWidth: 3,
  },
  iosBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  iosArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  iosTag: {
    marginTop: 2,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  iosTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5F3FF',
    textAlign: 'center',
  },
});

export const EventMarker = memo(EventMarkerComponent);
