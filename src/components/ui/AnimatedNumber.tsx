import React, { useEffect } from 'react';
import { type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 800,
  style,
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const num = decimals > 0
      ? animatedValue.value.toFixed(decimals)
      : Math.round(animatedValue.value).toLocaleString();
    return {
      text: `${prefix}${num}${suffix}`,
      defaultValue: `${prefix}${num}${suffix}`,
    };
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0, margin: 0 }, style]}
      animatedProps={animatedProps}
    />
  );
}
