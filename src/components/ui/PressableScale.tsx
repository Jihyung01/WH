import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  haptic?: boolean;
}

export function PressableScale({
  children,
  style,
  scaleValue = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleValue, { damping: 15, stiffness: 400 });
      onPressIn?.(e);
    },
    [scaleValue, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      onPressOut?.(e);
    },
    [onPressOut],
  );

  const handlePress = useCallback(
    (e: any) => {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
