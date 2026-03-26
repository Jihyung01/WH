import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

import { useLocationStore } from '../../../src/stores/locationStore';
import { useMapStore } from '../../../src/stores/mapStore';
import { checkinService } from '../../../src/services/checkinService';
import { getDistance } from '../../../src/utils/geo';
import { formatDistance } from '../../../src/utils/format';
import { CHECK_IN_RADIUS_METERS } from '../../../src/utils/constants';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../src/config/theme';

type CheckInState = 'approaching' | 'success' | 'error';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const currentPosition = useLocationStore((s) => s.currentPosition);
  const visibleEvents = useMapStore((s) => s.visibleEvents);

  const event = useMemo(
    () => visibleEvents.find((e) => e.id === id),
    [visibleEvents, id],
  );

  const [state, setState] = useState<CheckInState>('approaching');

  const distance = useMemo(() => {
    if (!currentPosition || !event) return null;
    return getDistance(currentPosition, event.location);
  }, [currentPosition, event]);

  const isInRange = distance !== null && distance <= CHECK_IN_RADIUS_METERS;

  // Radar pulse animations
  const pulse1 = useSharedValue(0.3);
  const pulse2 = useSharedValue(0.3);
  const pulse3 = useSharedValue(0.3);
  const pulse1Opacity = useSharedValue(0.6);
  const pulse2Opacity = useSharedValue(0.6);
  const pulse3Opacity = useSharedValue(0.6);

  // Success animation
  const successScale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (state === 'approaching') {
      const cfg = { duration: 2500, easing: Easing.out(Easing.ease) };
      pulse1.value = withRepeat(withTiming(1, cfg), -1, false);
      pulse1Opacity.value = withRepeat(withTiming(0, cfg), -1, false);
      pulse2.value = withRepeat(withDelay(600, withTiming(1, cfg)), -1, false);
      pulse2Opacity.value = withRepeat(withDelay(600, withTiming(0, cfg)), -1, false);
      pulse3.value = withRepeat(withDelay(1200, withTiming(1, cfg)), -1, false);
      pulse3Opacity.value = withRepeat(withDelay(1200, withTiming(0, cfg)), -1, false);
    }
  }, [state]);

  // Auto-check-in when in range
  useEffect(() => {
    if (isInRange && state === 'approaching') {
      performCheckIn();
    }
  }, [isInRange, state]);

  const performCheckIn = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState('success');
      successScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      checkScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 120 }));

      if (currentPosition && event) {
        try {
          await checkinService.create({
            eventId: event.id,
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
          });
        } catch {
          console.warn('Check-in API not available, proceeding locally');
        }
      }

      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error) {
      console.error('Check-in error:', error);
      setState('error');
    }
  };

  const makePulseStyle = (scale: Animated.SharedValue<number>, opacity: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

  const pulse1Style = makePulseStyle(pulse1, pulse1Opacity);
  const pulse2Style = makePulseStyle(pulse2, pulse2Opacity);
  const pulse3Style = makePulseStyle(pulse3, pulse3Opacity);

  const successAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const distanceColor = distance !== null
    ? distance <= 50 ? COLORS.success
    : distance <= 150 ? COLORS.warning
    : COLORS.error
    : COLORS.textMuted;

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
      </Pressable>

      {state === 'approaching' && (
        <View style={styles.content}>
          <Text style={styles.heading}>도착 인증</Text>
          <Text style={styles.subheading}>
            {event?.title ?? '이벤트 위치'}에 가까이 다가가세요
          </Text>

          {/* Radar */}
          <View style={styles.radarContainer}>
            <Animated.View style={[styles.radarRing, styles.radarRing3, pulse3Style]} />
            <Animated.View style={[styles.radarRing, styles.radarRing2, pulse2Style]} />
            <Animated.View style={[styles.radarRing, styles.radarRing1, pulse1Style]} />

            <View style={styles.radarCenter}>
              <Text style={styles.radarEmoji}>📍</Text>
            </View>

            {/* User dot — offset based on distance */}
            <View style={[styles.userDot, { bottom: distance !== null ? Math.min(distance / 3, 80) + 60 : 60 }]}>
              <View style={styles.userDotInner} />
            </View>
          </View>

          {/* Distance readout */}
          <View style={styles.distanceCard}>
            <Text style={[styles.distanceValue, { color: distanceColor }]}>
              {distance !== null ? formatDistance(distance) : '--'}
            </Text>
            <Text style={styles.distanceLabel}>
              {isInRange ? '범위 내 도달!' : `${CHECK_IN_RADIUS_METERS}m 이내로 접근하세요`}
            </Text>
          </View>
        </View>
      )}

      {state === 'success' && (
        <View style={styles.content}>
          <Animated.View style={[styles.successCircle, successAnimStyle]}>
            <Animated.View style={checkAnimStyle}>
              <Ionicons name="checkmark" size={72} color={COLORS.success} />
            </Animated.View>
          </Animated.View>

          <Animated.Text entering={FadeIn.delay(400)} style={styles.successTitle}>
            도착 인증 완료!
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(600)} style={styles.successSubtitle}>
            미션을 계속 진행하세요
          </Animated.Text>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.content}>
          <View style={styles.errorCircle}>
            <Ionicons name="close" size={72} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>인증 실패</Text>
          <Text style={styles.errorSubtitle}>목적지에 더 가까이 이동해주세요</Text>

          <Pressable
            style={styles.retryBtn}
            onPress={() => setState('approaching')}
          >
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const RADAR_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subheading: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },

  // ── Radar ──
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  radarRing1: {
    width: RADAR_SIZE * 0.4,
    height: RADAR_SIZE * 0.4,
  },
  radarRing2: {
    width: RADAR_SIZE * 0.7,
    height: RADAR_SIZE * 0.7,
  },
  radarRing3: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
  },
  radarCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  radarEmoji: { fontSize: 28 },
  userDot: {
    position: 'absolute',
    alignItems: 'center',
  },
  userDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#48DBFB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#48DBFB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Distance ──
  distanceCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: FONT_WEIGHT.extrabold,
    fontVariant: ['tabular-nums'],
    marginBottom: SPACING.xs,
  },
  distanceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // ── Success ──
  successCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 214, 143, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.success,
    marginBottom: SPACING.xxl,
  },
  successTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },

  // ── Error ──
  errorCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.error,
    marginBottom: SPACING.xxl,
  },
  errorTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
