import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';

import { useCharacterStore, getEvolutionStage, getEvolutionEmoji, getLevelTitle } from '../../src/stores/characterStore';
import { ItemRarity, CharacterClass } from '../../src/types/enums';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface RevealReward {
  type: 'xp' | 'badge' | 'item';
  name: string;
  description: string;
  rarity: ItemRarity;
  amount?: number;
  emoji: string;
}

const RARITY_GRADIENTS: Record<string, string[]> = {
  [ItemRarity.COMMON]:    ['#555B6E', '#3A3F52'],
  [ItemRarity.UNCOMMON]:  ['#00D68F', '#009B6A'],
  [ItemRarity.RARE]:      ['#48DBFB', '#0ABDE3'],
  [ItemRarity.EPIC]:      ['#7EE8CA', '#2DD4A8'],
  [ItemRarity.LEGENDARY]: ['#F0C040', '#FF9500'],
};

const RARITY_LABELS: Record<string, string> = {
  [ItemRarity.COMMON]: '일반',
  [ItemRarity.UNCOMMON]: '고급',
  [ItemRarity.RARE]: '희귀',
  [ItemRarity.EPIC]: '영웅',
  [ItemRarity.LEGENDARY]: '전설',
};

type Phase = 'gathering' | 'reveal' | 'xp' | 'levelup' | 'done';

export default function RewardRevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { character, addXp, clearLevelUp, levelUpPending } = useCharacterStore();

  const [phase, setPhase] = useState<Phase>('gathering');
  const [xpDisplayed, setXpDisplayed] = useState(0);

  // Mock reward based on id
  const reward: RevealReward = {
    type: 'badge',
    name: '홍대 탐험가',
    description: '홍대 지역 이벤트 3개 완료',
    rarity: ItemRarity.RARE,
    amount: 150,
    emoji: '🗺️',
  };

  // Particle animations
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.5);
  // Card animations
  const cardScale = useSharedValue(0);
  const cardRotateY = useSharedValue(180);
  // XP counter
  const xpBarWidth = useSharedValue(0);
  // Level up
  const levelUpScale = useSharedValue(0);

  useEffect(() => {
    runSequence();
  }, []);

  async function runSequence() {
    // Phase 1: Particles gather
    particleOpacity.value = withTiming(1, { duration: 600 });
    particleScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    await sleep(1200);

    // Phase 2: Card flies in and flips
    setPhase('reveal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    cardScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    await sleep(400);
    cardRotateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    await sleep(800);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Phase 3: XP counter
    setPhase('xp');
    const xpAmount = reward.amount ?? 100;
    addXp(xpAmount, reward.name);

    // Animate XP counting
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await sleep(30);
      setXpDisplayed(Math.round((i / steps) * xpAmount));
    }
    await sleep(500);

    // Phase 4: Level up?
    if (levelUpPending) {
      setPhase('levelup');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      levelUpScale.value = withSpring(1, { damping: 6, stiffness: 80 });
      await sleep(2500);
      clearLevelUp();
    }

    setPhase('done');
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  const particleStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
    transform: [{ scale: particleScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotateY: `${cardRotateY.value}deg` },
    ],
  }));

  const levelUpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelUpScale.value }],
    opacity: levelUpScale.value,
  }));

  const rarityGradient = RARITY_GRADIENTS[reward.rarity] ?? RARITY_GRADIENTS[ItemRarity.COMMON];

  return (
    <View style={styles.container}>
      {/* Darkened background */}
      <View style={styles.overlay} />

      {/* Particles */}
      {phase === 'gathering' && (
        <Animated.View style={[styles.particleContainer, particleStyle]}>
          {['✨', '💫', '⭐', '🌟', '✨', '💫', '✨', '⭐'].map((p, i) => (
            <Animated.Text
              key={i}
              entering={FadeIn.delay(i * 100)}
              style={[
                styles.particle,
                {
                  top: `${20 + (i * 8) % 50}%`,
                  left: `${10 + (i * 13) % 75}%`,
                  fontSize: 16 + (i % 4) * 6,
                },
              ]}
            >
              {p}
            </Animated.Text>
          ))}
        </Animated.View>
      )}

      {/* Reward card */}
      {(phase === 'reveal' || phase === 'xp' || phase === 'done') && (
        <View style={styles.cardCenter}>
          <Animated.View style={[styles.card, cardStyle]}>
            <LinearGradient
              colors={rarityGradient}
              style={styles.cardGradient}
            >
              <Text style={styles.cardRarity}>{RARITY_LABELS[reward.rarity]}</Text>
              <Text style={styles.cardEmoji}>{reward.emoji}</Text>
              <Text style={styles.cardName}>{reward.name}</Text>
              <Text style={styles.cardDesc}>{reward.description}</Text>
              <Text style={styles.cardAcquired}>획득!</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* XP float */}
      {(phase === 'xp' || phase === 'done') && (
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.xpFloat}>
          <Text style={styles.xpFloatText}>+{xpDisplayed} XP</Text>
        </Animated.View>
      )}

      {/* Level up overlay */}
      {phase === 'levelup' && character && (
        <Animated.View style={[styles.levelUpOverlay, levelUpStyle]}>
          <View style={styles.levelUpContent}>
            <Text style={styles.levelUpEmoji}>
              {getEvolutionEmoji(character.characterClass, getEvolutionStage(character.level))}
            </Text>
            <Text style={styles.levelUpTitle}>레벨 업!</Text>
            <Text style={styles.levelUpLevel}>Lv.{character.level} 달성!</Text>
            <Text style={styles.levelUpSubtitle}>
              {getLevelTitle(character.characterClass, character.level)}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* CTA */}
      {phase === 'done' && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.footer}>
          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace('/(tabs)/map');
            }}
          >
            <Text style={styles.ctaBtnText}>계속 탐험하기</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const CARD_W = SCREEN_W * 0.7;
const CARD_H = CARD_W * 1.4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // ── Particles ──
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
  },

  // ── Card ──
  cardCenter: {
    zIndex: 2,
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.lg,
    backfaceVisibility: 'hidden',
  },
  cardGradient: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  cardRarity: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.lg,
  },
  cardEmoji: {
    fontSize: 72,
    marginBottom: SPACING.xl,
  },
  cardName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  cardDesc: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  cardAcquired: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },

  // ── XP Float ──
  xpFloat: {
    position: 'absolute',
    bottom: '30%',
    zIndex: 3,
  },
  xpFloatText: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.primary,
    textShadowColor: 'rgba(108,92,231,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Level Up ──
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  levelUpContent: { alignItems: 'center' },
  levelUpEmoji: { fontSize: 80, marginBottom: SPACING.xl },
  levelUpTitle: {
    fontSize: 48,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  levelUpLevel: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  levelUpSubtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 48,
    left: SPACING.xl,
    right: SPACING.xl,
    zIndex: 5,
  },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  ctaBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
