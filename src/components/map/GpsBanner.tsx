import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface GpsBannerProps {
  visible: boolean;
}

export function GpsBanner({ visible }: GpsBannerProps) {
  if (!visible) return null;

  return (
    <Pressable style={styles.banner} onPress={() => Linking.openSettings()}>
      <Ionicons name="location-outline" size={18} color={COLORS.warning} />
      <Text style={styles.text}>위치 서비스를 켜주세요</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 19, 34, 0.95)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.warning,
  },
});
