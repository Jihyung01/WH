import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface AuthInputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

export function AuthInput({
  label,
  error,
  success,
  loading,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue(COLORS.borderLight);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderColor.value = withTiming(COLORS.primary, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!error) {
      borderColor.value = withTiming(COLORS.borderLight, { duration: 200 });
    }
    onBlur?.(e);
  };

  React.useEffect(() => {
    if (error) {
      borderColor.value = withTiming(COLORS.error, { duration: 200 });
    } else if (success) {
      borderColor.value = withTiming(COLORS.success, { duration: 200 });
    } else if (!isFocused) {
      borderColor.value = withTiming(COLORS.borderLight, { duration: 200 });
    }
  }, [error, success, isFocused]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Animated.View style={[styles.inputWrapper, animatedBorderStyle]}>
        {leftIcon && <Text style={styles.leftIcon}>{leftIcon}</Text>}
        
        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeftIcon]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={COLORS.primary} 
            style={styles.rightIcon}
          />
        )}
        
        {!loading && rightIcon && (
          <Text style={styles.rightIcon}>{rightIcon}</Text>
        )}
      </Animated.View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && !error && <Text style={styles.successText}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: SPACING.sm,
  },
  leftIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  rightIcon: {
    marginLeft: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  successText: {
    color: COLORS.success,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
});
