import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { MOOD_DISPLAY } from './constants';
import type { CharacterLoadout } from '../../types';
import type { CharacterMood } from '../../types/enums';
import { CharacterAvatar } from '../character/CharacterAvatar';

interface Props {
  characterType: string;
  characterName: string;
  level: number;
  title: string | null;
  mood: string;
  personalityTraits: string[];
  coins: number;
  loadout: CharacterLoadout[];
  onCustomize: () => void;
  onTitles: () => void;
}

export function CharacterInfoCard({
  characterType, characterName, level, title, mood,
  personalityTraits, coins, loadout,
  onCustomize, onTitles,
}: Props) {
  const moodInfo = MOOD_DISPLAY[mood] ?? MOOD_DISPLAY.happy;

  return (
    <View style={styles.container}>
      {/* Character + equipped items */}
      <View style={styles.topRow}>
        <View style={styles.charArea}>
          <CharacterAvatar
            characterType={characterType}
            level={level}
            size={56}
            loadout={loadout}
            mood={mood as CharacterMood}
            interactive={false}
            borderColor={COLORS.border}
            backgroundColor={COLORS.surface}
          />
        </View>
        <View style={styles.infoArea}>
          {/* Title */}
          <Pressable onPress={onTitles} style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title ?? 'Lv.' + level + ' ' + characterName}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </Pressable>

          {/* Mood */}
          <Text style={styles.moodText}>
            {moodInfo.emoji} {moodInfo.label}
          </Text>

          {/* Traits */}
          {personalityTraits.length > 0 && (
            <View style={styles.traitRow}>
              {personalityTraits.slice(0, 3).map((trait) => (
                <View key={trait} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Coins */}
          <Text style={styles.coinsText}>🪙 {coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Customize button */}
      <Pressable
        style={styles.customizeBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCustomize();
        }}
      >
        <Ionicons name="color-palette-outline" size={16} color={BRAND.primary} />
        <Text style={styles.customizeBtnText}>꾸미기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  charArea: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoArea: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  titleText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  moodText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  traitRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  traitBadge: {
    backgroundColor: `${BRAND.purple}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  traitText: {
    fontSize: FONT_SIZE.xs,
    color: BRAND.purple,
    fontWeight: FONT_WEIGHT.medium,
  },
  coinsText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.gold,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  customizeBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.primary,
  },
});
