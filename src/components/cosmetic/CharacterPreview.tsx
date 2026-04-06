import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { EquippedEffectBar } from './EquippedEffectBar';
import { CharacterRenderer } from './character-svg';
import { MOOD_DISPLAY } from './constants';
import type { CharacterLoadout, EquippedEffects } from '../../types';

interface Props {
  characterType: string;
  evolutionStage: string;
  name: string;
  level: number;
  title: string | null;
  mood: string;
  loadout: CharacterLoadout[];
  effects: EquippedEffects;
}

export function CharacterPreview({
  characterType, evolutionStage, name, level, title, mood, loadout, effects,
}: Props) {
  const moodInfo = MOOD_DISPLAY[mood] ?? MOOD_DISPLAY.happy;
  const hasBg = loadout.some((l) => l.slot === 'background');

  return (
    <View style={[styles.container, hasBg && styles.containerWithBg]}>
      {/* Title */}
      <Text style={styles.titleText} numberOfLines={1}>
        {title ? `${title} · ` : ''}Lv.{level} {name}
      </Text>

      {/* SVG Character */}
      <CharacterRenderer
        characterType={characterType}
        evolutionStage={evolutionStage}
        loadout={loadout}
        size={180}
      />

      {/* Mood */}
      <Text style={styles.moodText}>
        {name}의 기분: {moodInfo.emoji} {moodInfo.label}
      </Text>

      {/* Effects */}
      <EquippedEffectBar effects={effects} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  containerWithBg: {
    backgroundColor: `${BRAND.purple}08`,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.lg,
  },
  titleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  moodText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
});
