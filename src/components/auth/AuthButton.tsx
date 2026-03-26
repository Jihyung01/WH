import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AuthButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'kakao';
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

export function AuthButton({
  title,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  fullWidth = true,
  onPress,
  ...props
}: AuthButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'kakao':
        return styles.kakaoButton;
      case 'secondary':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'kakao':
        return styles.kakaoButtonText;
      case 'secondary':
        return styles.secondaryButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  return (
    <AnimatedPressable
      style={[
        styles.button,
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.buttonDisabled,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'kakao' ? COLORS.kakaoText : COLORS.textPrimary} 
        />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  fullWidth: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  kakaoButton: {
    backgroundColor: COLORS.kakaoYellow,
    shadowColor: COLORS.kakaoYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  kakaoButtonText: {
    color: COLORS.kakaoText,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
});
