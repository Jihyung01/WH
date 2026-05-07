import React, { useEffect } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
import { Marker, Circle as MapCircle } from 'react-native-maps';
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

/**
 * Single ASCII glyph per character type, drawn inside the inner disc on
 * Android. We deliberately avoid emoji / SVG / icon-fonts on Android because
 * Samsung One UI's marker bitmap snapshot has been observed to drop those
 * layers; a stock <Text> in the system sans font is the only thing the
 * snapshot reliably preserves.
 */
const ANDROID_CHARACTER_GLYPH: Record<string, string> = {
  explorer:  'D', // 도담
  foodie:    'N', // 나래
  artist:    'H', // 하람
  socialite: 'B', // 별찌
};
const ANDROID_CHARACTER_DEFAULT_GLYPH = 'O';

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

  const characterGlyph =
    characterType != null && characterLevel != null
      ? ANDROID_CHARACTER_GLYPH[characterType] ?? ANDROID_CHARACTER_DEFAULT_GLYPH
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
            Android-only path. Pure RN <View> + borderRadius for every ring,
            <Text> in the system sans font for the character glyph. No SVG,
            no emoji, no icon font — Samsung One UI's marker bitmap has been
            dropping all three of those on Z Flip. Stock RN primitives are
            the only thing the bitmap snapshot is guaranteed to capture.
          */}
          <View style={styles.androidContainer} collapsable={false}>
            <View style={styles.androidOuterRing} pointerEvents="none" />
            <View style={styles.androidMidRing}>
              <View
                style={[
                  styles.androidInnerDisc,
                  characterGlyph
                    ? styles.androidInnerDiscWithGlyph
                    : styles.androidInnerDiscEmpty,
                ]}
              >
                {characterGlyph ? (
                  <Text
                    style={styles.androidGlyph}
                    allowFontScaling={false}
                    numberOfLines={1}
                  >
                    {characterGlyph}
                  </Text>
                ) : null}
              </View>
            </View>
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
  androidOuterRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(72, 219, 251, 0.14)',
  },
  androidMidRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(72, 219, 251, 0.36)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidInnerDisc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidInnerDiscWithGlyph: {
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  androidInnerDiscEmpty: {
    backgroundColor: '#48DBFB',
  },
  androidGlyph: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
