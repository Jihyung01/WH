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
import Svg, { Circle as SvgCircle, G, Path as SvgPath } from 'react-native-svg';
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

/**
 * SVG icon paths used **only on Android** marker bitmaps.
 *
 * Background: Android snapshots a custom Marker view into a bitmap. A separate
 * absolute-positioned <Text> emoji layer is **not** reliably composited into that
 * bitmap (the emoji either drops out, mis-aligns, or floats outside the bubble),
 * which is exactly the broken render the user reported. Rendering the icon as
 * an SVG path inside the same Svg as the bubble guarantees a single atomic
 * bitmap with circle + glyph aligned.
 *
 * Paths are designed in a 16×16 viewBox with white fill. They are translated to
 * (20, 20) inside the 56×56 bubble so the icon is visually centered on the
 * circle origin (28, 28).
 */
const ANDROID_ICON_PATHS: Record<string, string> = {
  // ▲ Compass arrow — exploration
  exploration: 'M8 1.5 L11.5 11.5 L8 9.5 L4.5 11.5 Z',
  activity:    'M8 1.5 L11.5 11.5 L8 9.5 L4.5 11.5 Z',
  // ◳ Camera — culture / photo
  culture: 'M5.5 3.5 L4.5 5 H2.5 a1 1 0 00-1 1 v6.5 a1 1 0 001 1 h11 a1 1 0 001-1 V6 a1 1 0 00-1-1 h-2 l-1-1.5 z M8 6.5 a2.5 2.5 0 100 5 a2.5 2.5 0 000-5 z',
  photo:   'M5.5 3.5 L4.5 5 H2.5 a1 1 0 00-1 1 v6.5 a1 1 0 001 1 h11 a1 1 0 001-1 V6 a1 1 0 00-1-1 h-2 l-1-1.5 z M8 6.5 a2.5 2.5 0 100 5 a2.5 2.5 0 000-5 z',
  // ✦ 4-point sparkle — hidden_gem
  hidden_gem: 'M8 1 L9.4 6.6 L15 8 L9.4 9.4 L8 15 L6.6 9.4 L1 8 L6.6 6.6 Z',
  // 🍴 Fork & knife — food
  food: 'M3.5 1.5 v5 a1.5 1.5 0 001 1.4 V14.5 h1.4 V7.9 a1.5 1.5 0 001-1.4 V1.5 h-0.9 V5 H5.4 V1.5 H4.5 V5 H4 V1.5 z M11 1.5 c-1 0.6-1.7 2-1.7 3.6 v2 a1.4 1.4 0 001.2 1.4 v6 H11.5 V1.5 z',
  // ☕ Coffee cup — cafe
  cafe: 'M3 4.5 H11 V8.5 a3 3 0 01-3 3 H6 a3 3 0 01-3 -3 z M11 5.5 H12.5 a1.5 1.5 0 010 3 H11 z M5 12.5 H9 V13.5 H5 z',
  // 🌿 Leaf — nature
  nature: 'M14 2.5 c-3 0.5-7 1-9 3 c-2 2-2 4-1 5.8 l-1 1.7 l1 0.5 l1-1.7 c1.8 1 3.8 1 5.8-1 c2-2 2.5-5.5 3.2-8.3 z M5 11 c0-2.5 2-5 5-6.5',
  // 🌙 Moon — nightlife
  nightlife: 'M11.5 3 a5.5 5.5 0 105.5 5.5 a4.2 4.2 0 01-5.5 -5.5 z',
  // 🛍️ Bag — shopping
  shopping: 'M3 5 H13 L12.4 14 H3.6 z M5.4 5 c0-2 1.1-3.6 2.6-3.6 s2.6 1.6 2.6 3.6',
  // ❓ Question mark — quiz
  quiz: 'M8 1.5 c-2.5 0-4 1.6-4 4 h2 c0-1.2 0.8-2 2-2 s2 0.8 2 2 c0 1.2-1 1.7-2 2.4 c-0.6 0.4-1 1-1 1.8 V11 h2 V9.7 c0-0.4 0.3-0.7 0.8-1 c1.2-0.8 2.2-1.8 2.2-3.2 c0-2.4-1.5-4-4-4 z M7 12.5 H9 V14.5 H7 z',
  // 🤝 Handshake — partnership
  partnership: 'M2 8 L5 5 L8 8 L5 11 z M14 8 L11 5 L8 8 L11 11 z M5.5 8 H10.5 V9 H5.5 z',
};
// Default pin path (matches getMarkerConfig fallback).
const ANDROID_DEFAULT_ICON_PATH =
  'M8 1.5 c-3 0-5 2-5 5 c0 4 5 8 5 8 s5-4 5-8 c0-3-2-5-5-5 z M8 4.5 a2 2 0 100 4 a2 2 0 000-4 z';
// Checkmark for expired/completed events.
const ANDROID_CHECK_ICON_PATH = 'M3 8.5 L6.5 12 L13 4.5 L11.5 3 L6.5 9 L4.5 7 z';

const IS_ANDROID = Platform.OS === 'android';
const ANDROID_MARKER_WIDTH = 96;
const ANDROID_MARKER_HEIGHT = 72;
const ANDROID_MARKER_BOTTOM_HEIGHT = 22;
const ANDROID_BUBBLE_FRAME_SIZE = 56;
const ANDROID_BUBBLE_RADIUS = 21;
const ANDROID_BUBBLE_CENTER = ANDROID_BUBBLE_FRAME_SIZE / 2;
const ANDROID_HALO_RADIUS = 25;

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
    const iconPath = isExpired
      ? ANDROID_CHECK_ICON_PATH
      : ANDROID_ICON_PATHS[event.category] ?? ANDROID_DEFAULT_ICON_PATH;
    return (
      <Marker
        identifier={`event-${event.id}`}
        coordinate={coordinate}
        onPress={() => onPress(event)}
        tracksViewChanges={tracksViewChanges}
        anchor={{ x: 0.5, y: 0.66 }}
      >
        {/*
          Android renders the marker into a bitmap. We keep ALL drawing inside
          a single <Svg> so the circle + icon are guaranteed to composite as one
          atomic bitmap. (A separate <Text> emoji overlay was previously being
          dropped or mis-aligned during the snapshot, producing the “broken
          marker” the user saw.)
        */}
        <View
          style={styles.androidContainer}
          collapsable={false}
        >
          <View
            style={[
              styles.androidBubbleFrame,
              { opacity: markerOpacity },
            ]}
          >
            <Svg
              width={ANDROID_BUBBLE_FRAME_SIZE}
              height={ANDROID_BUBBLE_FRAME_SIZE}
              viewBox={`0 0 ${ANDROID_BUBBLE_FRAME_SIZE} ${ANDROID_BUBBLE_FRAME_SIZE}`}
            >
              {isInRange && !isExpired ? (
                <SvgCircle
                  cx={ANDROID_BUBBLE_CENTER}
                  cy={ANDROID_BUBBLE_CENTER}
                  r={ANDROID_HALO_RADIUS}
                  fill="none"
                  stroke={markerColor}
                  strokeWidth={3}
                  opacity={0.38}
                />
              ) : null}
              <SvgCircle
                cx={ANDROID_BUBBLE_CENTER}
                cy={ANDROID_BUBBLE_CENTER}
                r={ANDROID_BUBBLE_RADIUS}
                fill={markerColor}
                stroke={isInRange && !isExpired ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                strokeWidth={3}
              />
              {/* 16×16 path translated to (20,20) so the 16×16 viewBox is centered on (28,28). */}
              <G transform={`translate(${ANDROID_BUBBLE_CENTER - 8} ${ANDROID_BUBBLE_CENTER - 8})`}>
                <SvgPath d={iconPath} fill="#FFFFFF" />
              </G>
            </Svg>
          </View>
          {conditionalLabel && !isExpired ? (
            <View style={styles.androidTag} collapsable={false}>
              <Text style={styles.androidTagText} allowFontScaling={false} numberOfLines={1}>
                {conditionalLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.androidSpacer} />
          )}
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
    // Android MapView snapshots the marker view into a bitmap; fixed bounds
    // with breathing room prevent the circle border from being clipped.
    width: ANDROID_MARKER_WIDTH,
    height: ANDROID_MARKER_HEIGHT,
    paddingTop: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  androidBubbleFrame: {
    width: ANDROID_BUBBLE_FRAME_SIZE,
    height: ANDROID_BUBBLE_FRAME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidTag: {
    marginTop: 4,
    maxWidth: 92,
    minHeight: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  androidSpacer: {
    height: ANDROID_MARKER_BOTTOM_HEIGHT,
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
