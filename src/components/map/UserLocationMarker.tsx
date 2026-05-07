import React, { useEffect } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
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
import { getCharacterEmoji, getEvolutionStage } from '../../utils/characterAssets';

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

  const androidEmoji =
    characterType != null && characterLevel != null
      ? getCharacterEmoji(characterType, getEvolutionStage(characterLevel))
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
          <View
            style={styles.androidContainer}
            collapsable={false}
            renderToHardwareTextureAndroid
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
                fill={androidEmoji ? 'rgba(15,23,42,0.82)' : '#48DBFB'}
              />
            </Svg>
            {androidEmoji ? (
              <View style={styles.androidEmojiLayer} pointerEvents="none">
                <Text style={styles.androidEmoji} allowFontScaling={false}>
                  {androidEmoji}
                </Text>
              </View>
            ) : null}
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
  androidEmojiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ANDROID_MARKER_SIZE,
    height: ANDROID_MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidEmoji: {
    fontSize: 18,
    lineHeight: 22,
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
