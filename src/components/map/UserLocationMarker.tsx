import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
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
}

export function UserLocationMarker({ position, heading, showRadius = true }: UserLocationMarkerProps) {
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
        <Circle
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
            <View style={styles.dot} />
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
