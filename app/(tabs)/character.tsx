import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
  getLevelTitle,
  xpForLevel,
} from '../../src/stores/characterStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, BRAND, RARITY } from '../../src/config/theme';
import { MOOD_DISPLAY, SLOT_CONFIG } from '../../src/components/cosmetic/constants';
import { EquippedEffectBar } from '../../src/components/cosmetic/EquippedEffectBar';
import type { CharacterLoadout } from '../../src/types';
import type { CosmeticSlot } from '../../src/types/enums';

function getSlotEmoji(loadout: CharacterLoadout[], slot: CosmeticSlot): string | null {
  return loadout.find((l) => l.slot === slot)?.cosmetic?.preview_emoji ?? null;
}

export default function CharacterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    character, loadout, equippedEffects, coins, mood,
    personalityTraits, activeTitle, isLoading,
    fetchCharacter, fetchLoadout, fetchCoins, refreshPersonality,
  } = useCharacterStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const characterType = character?.character_type ?? 'explorer';
  const level = character?.level ?? 1;
  const xp = character?.xp ?? 0;
  const stage = getEvolutionStage(level);
  const emoji = getEvolutionEmoji(characterType, stage);
  const charName = character?.name ?? '도담';
  const levelTitle = getLevelTitle(characterType, level);
  const nextLevelXp = xpForLevel(level);
  const xpProgress = nextLevelXp > 0 ? Math.min(xp / nextLevelXp, 1) : 0;
  const moodInfo = MOOD_DISPLAY[mood] ?? MOOD_DISPLAY.happy;

  // Bounce animation for character tap
  const bounceY = useSharedValue(0);
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  // Aura pulse
  const auraPulse = useSharedValue(0);
  const hasAura = loadout.some((l) => l.slot === 'aura');
  useEffect(() => {
    if (hasAura) {
      auraPulse.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [hasAura]);
  const auraStyle = useAnimatedStyle(() => {
    if (!hasAura) return { opacity: 0 };
    return { opacity: 0.25 + auraPulse.value * 0.35, transform: [{ scale: 1 + auraPulse.value * 0.08 }] };
  });

  useEffect(() => {
    fetchCharacter();
    fetchLoadout();
    fetchCoins();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCharacter(), fetchLoadout(), fetchCoins()]);
    setRefreshing(false);
  }, []);

  const handleCharTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bounceY.value = withSequence(
      withSpring(-16, { damping: 4, stiffness: 300 }),
      withSpring(0, { damping: 8 }),
    );
  };

  const hatEmoji = getSlotEmoji(loadout, 'hat');
  const outfitEmoji = getSlotEmoji(loadout, 'outfit');
  const accessoryEmoji = getSlotEmoji(loadout, 'accessory');
  const auraEmoji = getSlotEmoji(loadout, 'aura');
  const bgItem = loadout.find((l) => l.slot === 'background');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>캐릭터</Text>
          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙 {coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Character Avatar Area ── */}
        <Animated.View entering={FadeIn.duration(400)} style={[styles.avatarSection, bgItem && styles.avatarSectionBg]}>
          {/* Title & Level */}
          <Pressable onPress={() => router.push('/titles' as any)} style={styles.titleRow}>
            <Text style={styles.titleText}>
              {activeTitle ?? levelTitle}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </Pressable>

          {/* Character display */}
          <Pressable onPress={handleCharTap} style={styles.charTouchArea}>
            {/* Aura ring */}
            {hasAura && (
              <Animated.View style={[styles.auraRing, auraStyle]}>
                {auraEmoji && <Text style={styles.auraEmoji}>{auraEmoji}</Text>}
              </Animated.View>
            )}

            {/* Hat */}
            {hatEmoji && <Text style={styles.hatSlot}>{hatEmoji}</Text>}

            {/* Character emoji */}
            <Animated.View style={bounceStyle}>
              <Text style={styles.charEmoji}>{emoji}</Text>
            </Animated.View>

            {/* Outfit */}
            {outfitEmoji && <Text style={styles.outfitSlot}>{outfitEmoji}</Text>}

            {/* Accessory */}
            {accessoryEmoji && <Text style={styles.accessorySlot}>{accessoryEmoji}</Text>}
          </Pressable>

          {/* Name & Level bar */}
          <Text style={styles.charName}>Lv.{level} {charName}</Text>
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>{xp} / {nextLevelXp} XP</Text>
          </View>

          {/* Mood */}
          <Text style={styles.moodText}>
            {charName}의 기분: {moodInfo.emoji} {moodInfo.label}
          </Text>

          {/* Equipped effects */}
          <EquippedEffectBar effects={equippedEffects} />
        </Animated.View>

        {/* ── Equipped Slots Preview ── */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.slotsRow}>
          {SLOT_CONFIG.map(({ key, emoji: slotEmoji, label }) => {
            const equipped = getSlotEmoji(loadout, key);
            return (
              <View key={key} style={styles.slotItem}>
                <View style={[styles.slotCircle, equipped ? styles.slotCircleFilled : undefined]}>
                  <Text style={styles.slotItemEmoji}>{equipped ?? slotEmoji}</Text>
                </View>
                <Text style={styles.slotLabel}>{label}</Text>
              </View>
            );
          })}
        </Animated.View>

        {/* ── Personality Traits ── */}
        {personalityTraits.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>성격 특성</Text>
            <View style={styles.traitsRow}>
              {personalityTraits.slice(0, 5).map((trait) => (
                <View key={trait} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Action Buttons ── */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.actionsGrid}>
          <ActionButton
            icon="color-palette"
            label="꾸미기"
            color={BRAND.primary}
            onPress={() => router.push('/character-customize' as any)}
          />
          <ActionButton
            icon="storefront"
            label="상점"
            color={BRAND.gold}
            onPress={() => router.push('/shop' as any)}
          />
          <ActionButton
            icon="ribbon"
            label="칭호"
            color={BRAND.purple}
            onPress={() => router.push('/titles' as any)}
          />
          <ActionButton
            icon="chatbubble-ellipses"
            label="대화"
            color={BRAND.coral}
            onPress={() => router.push('/chat' as any)}
          />
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function ActionButton({ icon, label, color, onPress }: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.actionBtn}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  coinBadge: {
    backgroundColor: `${BRAND.gold}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  coinText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
  },
  avatarSectionBg: {
    backgroundColor: `${BRAND.purple}08`,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  titleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  charTouchArea: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: BRAND.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraEmoji: {
    fontSize: 16,
    position: 'absolute',
    top: -2,
    right: 14,
  },
  hatSlot: {
    fontSize: 32,
    position: 'absolute',
    top: 4,
    zIndex: 1,
  },
  charEmoji: {
    fontSize: 80,
  },
  outfitSlot: {
    fontSize: 24,
    position: 'absolute',
    bottom: 16,
  },
  accessorySlot: {
    fontSize: 24,
    position: 'absolute',
    right: 8,
    top: '45%',
  },
  charName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  xpBarContainer: {
    width: '70%',
    alignItems: 'center',
    gap: 4,
  },
  xpBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceHighlight,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
  xpText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  moodText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // Slots row
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  slotItem: {
    alignItems: 'center',
    gap: 4,
  },
  slotCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCircleFilled: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}10`,
  },
  slotItemEmoji: {
    fontSize: 22,
  },
  slotLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Section
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  traitBadge: {
    backgroundColor: `${BRAND.purple}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  traitText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND.purple,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Action buttons
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  actionBtn: {
    width: '47%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
