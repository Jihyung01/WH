import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { formatTimer } from '../../utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface TimerMissionProps {
  durationSeconds: number;
  description: string;
  onComplete: () => void;
  isActive: boolean;
  isCompleted: boolean;
}

export function TimerMission({ durationSeconds, description, onComplete, isActive, isCompleted }: TimerMissionProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  useEffect(() => {
    if (isActive && !started && !isCompleted) {
      setStarted(true);
      progress.value = withTiming(1, {
        duration: durationSeconds * 1000,
        easing: Easing.linear,
      });

      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const iconColor = isCompleted ? COLORS.success : isActive ? COLORS.warning : COLORS.textMuted;

  return (
    <View style={[styles.container, !isActive && !isCompleted && styles.containerDisabled]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, isCompleted && styles.iconCircleSuccess]}>
          <Ionicons
            name={isCompleted ? 'checkmark' : 'timer'}
            size={24}
            color={iconColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.label}>{description}</Text>
          {isCompleted ? (
            <Text style={styles.sublabelSuccess}>완료!</Text>
          ) : isActive ? (
            <Text style={styles.timerText}>{formatTimer(remaining)}</Text>
          ) : (
            <Text style={styles.sublabel}>이전 단계를 완료해주세요</Text>
          )}
        </View>
      </View>

      {isActive && !isCompleted && (
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  containerDisabled: { opacity: 0.5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
  headerInfo: { flex: 1 },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  sublabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sublabelSuccess: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.success,
    marginTop: 2,
  },
  timerText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 2,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 2,
  },
});
