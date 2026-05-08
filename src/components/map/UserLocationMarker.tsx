import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

/**
 * 9d77a82 (마커가 동그랗게 정상 동작했던 시점) 의 패턴 복원.
 * 핵심: 플랫폼 분기 없이 동일 view tree 사용 + tracksViewChanges=false.
 * `CharacterAvatar`는 expo-image 기반이라 Android marker bitmap 에서도
 * 안정적으로 캡처된다. 별도의 Android-only SVG/Text 경로는 오히려 OEM ROM
 * 별로 비트맵 누락을 일으켜 회귀였음.
 */
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
                borderColor="#1A1612"      /* manga ink */
                backgroundColor="#FFD93D"  /* manga yellow */
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
  // manga 톤 — 노랑 펄스 + 잉크 외곽선 + 노랑 dot.
  pulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 217, 61, 0.42)',  /* manga yellow soft */
    borderWidth: 2,
    borderColor: '#1A1612',
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
    borderBottomColor: 'rgba(255, 217, 61, 0.4)',  /* manga yellow */
    top: 4,
  },
  outerRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFEF5',          /* manga paper */
    borderWidth: 2.5,
    borderColor: '#1A1612',              /* manga ink */
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD93D',          /* manga yellow */
    borderWidth: 2.5,
    borderColor: '#1A1612',
  },
});
