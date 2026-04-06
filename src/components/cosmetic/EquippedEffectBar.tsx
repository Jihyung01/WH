import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import type { EquippedEffects } from '../../types';

interface Props {
  effects: EquippedEffects;
}

export function EquippedEffectBar({ effects }: Props) {
  const parts: string[] = [];

  if (effects.xp_boost > 0) parts.push(`XP +${effects.xp_boost}%`);
  if (effects.discovery_range > 0) parts.push(`탐지 +${effects.discovery_range}m`);
  if (effects.coin_bonus > 0) parts.push(`코인 +${effects.coin_bonus}%`);
  if (effects.streak_shield) parts.push('🛡️ 스트릭 보호');

  if (parts.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{parts.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'center',
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.primary,
  },
});
