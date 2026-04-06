import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { EquippedEffectBar } from './EquippedEffectBar';
import { MOOD_DISPLAY } from './constants';
import type { CharacterLoadout, EquippedEffects } from '../../types';
import type { CosmeticSlot } from '../../types/enums';

interface Props {
  emoji: string;
  name: string;
  level: number;
  title: string | null;
  mood: string;
  loadout: CharacterLoadout[];
  effects: EquippedEffects;
}

function getLoadoutEmoji(loadout: CharacterLoadout[], slot: CosmeticSlot): string | null {
  const item = loadout.find((l) => l.slot === slot);
  return item?.cosmetic?.preview_emoji ?? null;
}

export function CharacterPreview({ emoji, name, level, title, mood, loadout, effects }: Props) {
  const bounceY = useSharedValue(0);

  // Aura pulse animation
  const auraPulse = useSharedValue(0);
  const hasAura = loadout.some((l) => l.slot === 'aura');

  React.useEffect(() => {
    if (hasAura) {
      auraPulse.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [hasAura]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  const auraStyle = useAnimatedStyle(() => {
    if (!hasAura) return { opacity: 0 };
    return {
      opacity: 0.3 + auraPulse.value * 0.4,
      transform: [{ scale: 1 + auraPulse.value * 0.1 }],
    };
  });

  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bounceY.value = withSequence(
      withSpring(-12, { damping: 4, stiffness: 300 }),
      withSpring(0, { damping: 8 }),
    );
  }, []);

  const hatEmoji = getLoadoutEmoji(loadout, 'hat');
  const outfitEmoji = getLoadoutEmoji(loadout, 'outfit');
  const accessoryEmoji = getLoadoutEmoji(loadout, 'accessory');
  const bgEmoji = getLoadoutEmoji(loadout, 'background');
  const auraEmoji = getLoadoutEmoji(loadout, 'aura');
  const moodInfo = MOOD_DISPLAY[mood] ?? MOOD_DISPLAY.happy;

  return (
    <View style={[styles.container, bgEmoji ? styles.containerWithBg : undefined]}>
      {/* Title */}
      <Text style={styles.titleText} numberOfLines={1}>
        {title ? `${title} · ` : ''}Lv.{level} {name}
      </Text>

      {/* Character area */}
      <Pressable onPress={handleTap} style={styles.characterArea}>
        {/* Aura */}
        {hasAura && (
          <Animated.View style={[styles.auraRing, auraStyle]}>
            <Text style={styles.auraEmoji}>{auraEmoji}</Text>
          </Animated.View>
        )}

        {/* Hat */}
        {hatEmoji && <Text style={styles.hatSlot}>{hatEmoji}</Text>}

        {/* Main character */}
        <Animated.View style={bounceStyle}>
          <Text style={styles.characterEmoji}>{emoji}</Text>
        </Animated.View>

        {/* Outfit */}
        {outfitEmoji && <Text style={styles.outfitSlot}>{outfitEmoji}</Text>}

        {/* Accessory */}
        {accessoryEmoji && <Text style={styles.accessorySlot}>{accessoryEmoji}</Text>}
      </Pressable>

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
  characterArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: BRAND.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraEmoji: {
    fontSize: 14,
    position: 'absolute',
    top: -4,
    right: 10,
  },
  hatSlot: {
    fontSize: 28,
    position: 'absolute',
    top: 8,
    zIndex: 1,
  },
  characterEmoji: {
    fontSize: 72,
  },
  outfitSlot: {
    fontSize: 22,
    position: 'absolute',
    bottom: 20,
  },
  accessorySlot: {
    fontSize: 22,
    position: 'absolute',
    right: 10,
    top: '50%',
  },
  moodText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
});
