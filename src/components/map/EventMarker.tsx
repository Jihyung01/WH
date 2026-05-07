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

/**
 * Android-only category glyph.
 *
 * Why ASCII (and not emoji/SVG/Ionicons):
 * - Ionicons font glyphs aren't always loaded when the marker bitmap is
 *   captured → boxes / wrong glyphs.
 * - Emoji glyphs render through a separate emoji font that is sometimes not
 *   composited into the marker bitmap on certain OEM ROMs (notably Samsung
 *   One UI on Z Flip) → emoji floats outside / drops from the bubble.
 * - react-native-svg renders into a TextureView/SurfaceView that the Google
 *   Maps marker bitmap snapshot does not always capture cleanly on the same
 *   OEM ROMs → empty bitmap or partial paths.
 * - A bold ASCII letter rendered with `<Text>` in the device's default sans
 *   font is the ONE thing the marker bitmap is guaranteed to contain.
 *
 * Each value is a single ASCII character so layout & font matching are
 * predictable. Distinguishing categories at a glance on the map relies on
 * the bubble color (already set per category in `MARKER_CONFIG`).
 */
const ANDROID_CATEGORY_GLYPH: Record<string, string> = {
  exploration: 'E',
  activity:    'E',
  culture:     'C',
  hidden_gem:  '*', // sparkle
  food:        'F',
  cafe:        'K', // K so it doesn't collide with Culture's "C"
  nature:      'N',
  nightlife:   'M', // Moonlight
  shopping:    'S',
  photo:       'P',
  quiz:        '?',
  partnership: '&',
};
const ANDROID_DEFAULT_GLYPH = 'O';
const ANDROID_EXPIRED_GLYPH = 'v'; // small visual checkmark substitute

const IS_ANDROID = Platform.OS === 'android';
const ANDROID_MARKER_WIDTH = 96;
const ANDROID_MARKER_HEIGHT = 72;
const ANDROID_MARKER_BOTTOM_HEIGHT = 22;
const ANDROID_BUBBLE_FRAME_SIZE = 56;
const ANDROID_BUBBLE_RADIUS = 21;
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
    const glyph = isExpired
      ? ANDROID_EXPIRED_GLYPH
      : ANDROID_CATEGORY_GLYPH[event.category] ?? ANDROID_DEFAULT_GLYPH;
    const showHalo = isInRange && !isExpired;
    return (
      <Marker
        identifier={`event-${event.id}`}
        coordinate={coordinate}
        onPress={() => onPress(event)}
        tracksViewChanges={tracksViewChanges}
        anchor={{ x: 0.5, y: 0.66 }}
      >
        {/*
          Android-only path. Pure RN <View> + borderRadius for the disc, plain
          <Text> with a bold ASCII glyph for the icon. No SVG, no emoji, no
          icon font — those three are exactly what Samsung One UI's marker
          bitmap snapshot has been mis-handling for this user. Everything here
          is a stock RN primitive that the marker bitmap captures verbatim.
        */}
        <View style={styles.androidContainer} collapsable={false}>
          <View style={styles.androidBubbleFrame}>
            {showHalo ? (
              <View
                pointerEvents="none"
                style={[
                  styles.androidHalo,
                  { borderColor: markerColor },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.androidBubble,
                {
                  backgroundColor: markerColor,
                  opacity: markerOpacity,
                  borderColor: showHalo ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                },
              ]}
            >
              <Text
                style={styles.androidGlyph}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {glyph}
              </Text>
            </View>
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
  androidBubble: {
    width: ANDROID_BUBBLE_RADIUS * 2,
    height: ANDROID_BUBBLE_RADIUS * 2,
    borderRadius: ANDROID_BUBBLE_RADIUS,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidHalo: {
    position: 'absolute',
    width: ANDROID_HALO_RADIUS * 2,
    height: ANDROID_HALO_RADIUS * 2,
    borderRadius: ANDROID_HALO_RADIUS,
    borderWidth: 3,
    opacity: 0.38,
  },
  androidGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
