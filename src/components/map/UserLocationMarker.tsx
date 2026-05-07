import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Marker, Circle as MapCircle } from 'react-native-maps';
import Svg, { Circle as SvgCircle, G, Path } from 'react-native-svg';
import { CharacterAvatar } from '../character/CharacterAvatar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { GeoPoint } from '../../types';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';

interface UserLocationMarkerProps {
  position: GeoPoint;
  heading: number | null;
  showRadius?: boolean;
  characterType?: string;
  characterLevel?: number;
  favoriteDistrict?: string | null;
}

const IS_ANDROID = Platform.OS === 'android';
const ANDROID_MARKER_SIZE = 80;
const ANDROID_CENTER = ANDROID_MARKER_SIZE / 2;

/**
 * Per-character SVG path used **only on Android** marker bitmaps.
 *
 * Why: Android snapshots the marker view into a bitmap; an absolute-positioned
 * <Text> emoji layer is not reliably composited into that bitmap, leaving the
 * emoji floating outside / mis-aligned to the circle (the broken render the
 * user reported). Drawing the icon as an SVG path inside the same Svg as the
 * circles guarantees a single atomic bitmap.
 *
 * Paths are drawn in a 12×12 viewBox with white fill, translated to the SVG
 * center (40, 40) – the small (r=10) inner disc is exactly that size.
 */
const ANDROID_CHARACTER_PATHS: Record<string, string> = {
  // 🌱 explorer (도담) – sprout / leaf cluster
  explorer:  'M6 1 c-2 0-3 1-3 3 c0 2 1 3 3 4 c2-1 3-2 3-4 c0-2-1-3-3-3 z M6 8 v3',
  // 🍃 foodie (나래) – flowing leaf
  foodie:    'M2 6 c1-3 4-5 8-4 c-1 4-3 6-6 7 c-1 0-2-1-2-3 z M3 9 l3-3',
  // 🔥 artist (하람) – flame
  artist:    'M6 1 c-1 2-3 3-3 6 c0 2 1.5 4 3 4 s3-2 3-4 c0-1-1-2-1-3 c-1 0-1 1-1 2 c0-2-1-3-1-5 z',
  // ✨ socialite (별찌) – 4-point sparkle
  socialite: 'M6 1 L7 5 L11 6 L7 7 L6 11 L5 7 L1 6 L5 5 Z',
};
const ANDROID_CHARACTER_DEFAULT_PATH = 'M6 2 a4 4 0 100 8 a4 4 0 000-8 z';

export function UserLocationMarker({
  position,
  heading,
  showRadius = true,
  characterType,
  characterLevel,
  favoriteDistrict,
}: UserLocationMarkerProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const characterPath =
    characterType != null && characterLevel != null
      ? ANDROID_CHARACTER_PATHS[characterType] ?? ANDROID_CHARACTER_DEFAULT_PATH
      : null;

  if (IS_ANDROID) {
    return (
      <>
        {showRadius && (
          <MapCircle
            center={position}
            radius={CHECK_IN_RADIUS_METERS}
            fillColor="rgba(108, 92, 231, 0.08)"
            strokeColor="rgba(108, 92, 231, 0.25)"
            strokeWidth={1}
          />
        )}

        <Marker
          identifier="user-location"
          coordinate={position}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges
        >
          {/*
            Render rings + character glyph as ONE Svg so the marker bitmap
            captures everything atomically. Previously the character emoji
            was a separate <Text> overlay which Android dropped/mis-aligned
            during the bitmap snapshot.
          */}
          <View
            style={styles.androidContainer}
            collapsable={false}
          >
            <Svg
              width={ANDROID_MARKER_SIZE}
              height={ANDROID_MARKER_SIZE}
              viewBox={`0 0 ${ANDROID_MARKER_SIZE} ${ANDROID_MARKER_SIZE}`}
            >
              {heading !== null ? (
                <G transform={`rotate(${heading} ${ANDROID_CENTER} ${ANDROID_CENTER})`}>
                  <Path
                    d={`M${ANDROID_CENTER} 8 L${ANDROID_CENTER - 12} 36 L${ANDROID_CENTER + 12} 36 Z`}
                    fill="rgba(72, 219, 251, 0.16)"
                  />
                </G>
              ) : null}
              <SvgCircle
                cx={ANDROID_CENTER}
                cy={ANDROID_CENTER}
                r={27}
                fill="rgba(72, 219, 251, 0.14)"
              />
              <SvgCircle
                cx={ANDROID_CENTER}
                cy={ANDROID_CENTER}
                r={19}
                fill="rgba(72, 219, 251, 0.36)"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth={3}
              />
              <SvgCircle
                cx={ANDROID_CENTER}
                cy={ANDROID_CENTER}
                r={10}
                fill={characterPath ? 'rgba(15,23,42,0.92)' : '#48DBFB'}
              />
              {characterPath ? (
                /* 12×12 path translated so it's centered on (40, 40). */
                <G transform={`translate(${ANDROID_CENTER - 6} ${ANDROID_CENTER - 6})`}>
                  <Path d={characterPath} fill="#FFFFFF" />
                </G>
              ) : null}
            </Svg>
          </View>
        </Marker>
      </>
    );
  }

  return (
    <>
      {showRadius && (
        <MapCircle
          center={position}
          radius={CHECK_IN_RADIUS_METERS}
          fillColor="rgba(108, 92, 231, 0.08)"
          strokeColor="rgba(108, 92, 231, 0.25)"
          strokeWidth={1}
        />
      )}

      <Marker
        identifier="user-location"
        coordinate={position}
        anchor={{ x: 0.5, y: 0.5 }}
        flat
        tracksViewChanges={false}
      >
        <View style={styles.container}>
          <Animated.View style={[styles.pulse, pulseStyle]} />

          <View
            pointerEvents={heading === null ? 'none' : 'auto'}
            style={[
              styles.headingCone,
              { opacity: heading === null ? 0 : 1 },
              heading !== null && { transform: [{ rotate: `${heading}deg` }] },
            ]}
          >
            <View style={styles.cone} />
          </View>

          <View style={styles.outerRing}>
            {characterType != null && characterLevel != null ? (
              <CharacterAvatar
                characterType={characterType}
                level={characterLevel}
                size={22}
                showLoadoutOverlay={false}
                showEvolutionBadge={false}
                favoriteDistrict={favoriteDistrict}
                borderColor="#FFFFFF"
                backgroundColor="rgba(72,219,251,0.35)"
                interactive={false}
              />
            ) : (
              <View style={styles.dot} />
            )}
          </View>
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidContainer: {
    width: ANDROID_MARKER_SIZE,
    height: ANDROID_MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(72, 219, 251, 0.3)',
  },
  headingCone: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(72, 219, 251, 0.15)',
    top: 4,
  },
  outerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#48DBFB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#48DBFB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
