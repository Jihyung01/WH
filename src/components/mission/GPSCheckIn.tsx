import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore } from '../../stores/locationStore';
import { getDistance } from '../../utils/geo';
import { formatDistance } from '../../utils/format';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';
import type { GeoPoint } from '../../types';

interface GPSCheckInProps {
  targetLocation: GeoPoint;
  onComplete: () => void;
  isActive: boolean;
}

export function GPSCheckIn({ targetLocation, onComplete, isActive }: GPSCheckInProps) {
  const currentPosition = useLocationStore((s) => s.currentPosition);
  const distance = currentPosition ? getDistance(currentPosition, targetLocation) : null;
  const isInRange = distance !== null && distance <= CHECK_IN_RADIUS_METERS;

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && isInRange) {
      onComplete();
    }
  }, [isActive, isInRange]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  if (!isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="location" size={24} color={COLORS.textMuted} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>목적지에 도착하세요</Text>
          <Text style={styles.sublabel}>이전 단계를 완료해주세요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <View style={[styles.iconCircle, isInRange && styles.iconCircleSuccess]}>
          <Ionicons
            name={isInRange ? 'checkmark' : 'navigate'}
            size={24}
            color={isInRange ? COLORS.success : COLORS.info}
          />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>
          {isInRange ? '도착 확인됨!' : '목적지에 도착하세요'}
        </Text>
        <Text style={[styles.sublabel, isInRange && styles.sublabelSuccess]}>
          {distance !== null
            ? isInRange
              ? '위치 인증 완료'
              : `${formatDistance(distance)} 남음`
            : '위치 확인 중...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.info,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(0, 214, 143, 0.15)',
  },
  info: { flex: 1 },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  sublabelSuccess: {
    color: COLORS.success,
  },
});
