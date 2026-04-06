import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../config/theme';
import { RARITY_COLORS, RARITY_LABELS } from './constants';
import type { Cosmetic } from '../../types';

interface Props {
  cosmetic: Cosmetic;
  isOwned: boolean;
  isEquipped: boolean;
  onPress: (cosmetic: Cosmetic) => void;
  index?: number;
}

export function CosmeticCard({ cosmetic, isOwned, isEquipped, onPress, index = 0 }: Props) {
  const rarityColor = RARITY_COLORS[cosmetic.rarity] ?? RARITY_COLORS.common;
  const isLegendary = cosmetic.rarity === 'legendary';
  const isEpic = cosmetic.rarity === 'epic';

  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    if (isLegendary) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isLegendary]);

  const shimmerStyle = useAnimatedStyle(() => {
    if (!isLegendary) return {};
    return {
      borderColor: `rgba(245, 158, 11, ${0.4 + shimmer.value * 0.6})`,
      shadowOpacity: 0.2 + shimmer.value * 0.3,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!isEpic) return {};
    return {
      shadowOpacity: 0.15 + shimmer.value * 0.2,
    };
  });

  const handlePress = () => {
    Haptics.impactAsync(
      isOwned ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    onPress(cosmetic);
  };

  const effectText = getEffectText(cosmetic);

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(200)}
      style={styles.wrapper}
    >
      <Pressable onPress={handlePress}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: rarityColor },
            !isOwned && styles.cardLocked,
            isLegendary && styles.cardLegendary,
            isEpic && styles.cardEpic,
            isLegendary && shimmerStyle,
            isEpic && glowStyle,
          ]}
        >
          {/* Equipped check */}
          {isEquipped && (
            <View style={[styles.equippedBadge, { backgroundColor: rarityColor }]}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </View>
          )}

          {/* Lock icon for unowned */}
          {!isOwned && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={18} color={COLORS.textMuted} />
            </View>
          )}

          {/* Emoji */}
          <Text style={[styles.emoji, !isOwned && styles.emojiLocked]}>
            {cosmetic.preview_emoji}
          </Text>

          {/* Name */}
          <Text style={[styles.name, !isOwned && styles.nameLocked]} numberOfLines={1}>
            {cosmetic.name}
          </Text>

          {/* Effect */}
          {effectText && (
            <Text style={styles.effect} numberOfLines={1}>{effectText}</Text>
          )}

          {/* Rarity */}
          <Text style={[styles.rarity, { color: rarityColor }]}>
            {RARITY_LABELS[cosmetic.rarity]}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function getEffectText(cosmetic: Cosmetic): string | null {
  if (!cosmetic.effect_type || cosmetic.effect_type === 'cosmetic_only') return null;
  switch (cosmetic.effect_type) {
    case 'xp_boost': return `XP +${cosmetic.effect_value}%`;
    case 'discovery_range': return `탐지 +${cosmetic.effect_value}m`;
    case 'streak_shield': return '스트릭 보호';
    case 'coin_bonus': return `코인 +${cosmetic.effect_value}%`;
    default: return cosmetic.effect_description;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  card: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    minHeight: 130,
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardLegendary: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 6,
  },
  cardEpic: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  equippedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emoji: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  emojiLocked: {
    opacity: 0.5,
  },
  name: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  nameLocked: {
    color: COLORS.textMuted,
  },
  effect: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  rarity: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
});
