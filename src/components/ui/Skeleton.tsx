import React, { useEffect } from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import { BORDER_RADIUS } from '../../config/theme';

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
