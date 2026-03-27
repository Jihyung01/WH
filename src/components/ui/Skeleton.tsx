import React, { useEffect } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import { BORDER_RADIUS, SPACING, SHADOWS } from '../../config/theme';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, radius = BORDER_RADIUS.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceHighlight,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonGroupProps {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ lines = 3, style }: SkeletonGroupProps) {
  const { colors } = useTheme();

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Skeleton width="40%" height={14} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={12}
        />
      ))}
    </Animated.View>
  );
}

export function EventCardSkeleton({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: SPACING.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceLight,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
            gap: SPACING.md,
            ...SHADOWS.sm,
          }}
        >
          <Skeleton width={64} height={64} radius={BORDER_RADIUS.sm} />
          <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <Skeleton width={48} height={16} radius={BORDER_RADIUS.sm} />
              <Skeleton width={40} height={16} radius={BORDER_RADIUS.sm} />
            </View>
            <Skeleton width="75%" height={16} />
            <Skeleton width="50%" height={12} />
            <Skeleton width={60} height={14} radius={BORDER_RADIUS.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function BadgeGridSkeleton({ count = 6 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: '47%',
            alignItems: 'center',
            padding: SPACING.lg,
            backgroundColor: colors.surfaceLight,
            borderRadius: BORDER_RADIUS.md,
            borderWidth: 2,
            borderColor: colors.surfaceHighlight,
            gap: SPACING.sm,
          }}
        >
          <Skeleton width={36} height={36} radius={18} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      ))}
    </View>
  );
}

export function ItemListSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: SPACING.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceLight,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.lg,
            gap: SPACING.md,
            borderWidth: 1,
            borderColor: colors.surfaceHighlight,
          }}
        >
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="30%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: SPACING.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <Skeleton width={32} height={32} radius={16} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="100%" height={8} radius={4} />
          </View>
          <Skeleton width={40} height={16} />
        </View>
      ))}
    </View>
  );
}

export function MapLoadingOverlay() {
  const { colors } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.3,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 56 + 44 + 12,
          left: SPACING.lg,
          right: SPACING.lg,
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          ...SHADOWS.md,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Skeleton width={20} height={20} radius={10} />
      <Skeleton width={140} height={14} />
    </Animated.View>
  );
}
