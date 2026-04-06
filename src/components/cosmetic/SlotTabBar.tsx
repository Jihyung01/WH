import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { SLOT_CONFIG } from './constants';
import type { CosmeticSlot } from '../../types/enums';

interface Props {
  activeSlot: CosmeticSlot;
  onSlotChange: (slot: CosmeticSlot) => void;
}

export function SlotTabBar({ activeSlot, onSlotChange }: Props) {
  return (
    <View style={styles.container}>
      {SLOT_CONFIG.map(({ key, emoji, label }) => {
        const isActive = key === activeSlot;
        return (
          <Pressable
            key={key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSlotChange(key);
            }}
          >
            <Text style={styles.tabEmoji}>{emoji}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  tabActive: {
    backgroundColor: `${BRAND.primary}25`,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
});
