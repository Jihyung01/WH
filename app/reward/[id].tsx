import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';

import { useCharacterStore, getLevelTitle } from '../../src/stores/characterStore';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { completeEvent } from '../../src/lib/api';
import type { CompleteEventResult, CosmeticDropResult } from '../../src/types';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import ShareJournalCard from '../../src/components/share/ShareJournalCard';
import { useShareJournal } from '../../src/hooks/useShareJournal';
import {
  fireImpactHeavy,
  fireImpactLight,
  fireImpactMedium,
  fireNotificationSuccess,
} from '../../src/utils/hapticsSafe';

const { width: SCREEN_W } = Dimensions.get('window');

const RARITY_GRADIENTS: Record<string, [string, string]> = {
  common:    ['#555B6E', '#3A3F52'],
  rare:      ['#48DBFB', '#0ABDE3'],
  epic:      ['#A855F7', '#7C3AED'],
  legendary: ['#F0C040', '#FF9500'],
};

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156,163,175,0.3)',
  rare: 'rgba(59,130,246,0.5)',
  epic: 'rgba(168,85,247,0.6)',
  legendary: 'rgba(245,158,11,0.7)',
};

type Phase = 'gathering' | 'reveal' | 'xp' | 'coins' | 'cosmetic' | 'title' | 'personality' | 'levelup' | 'done';

export default function RewardRevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { character, fetchCharacter, fetchLoadout, fetchCoins } = useCharacterStore();
  const { shareData, isReady: shareReady, prepare: prepareShare } = useShareJournal();

  const [phase, setPhase] = useState<Phase>('gathering');
  const [xpDisplayed, setXpDisplayed] = useState(0);
  const [coinsDisplayed, setCoinsDisplayed] = useState(0);
  const [rewardData, setRewardData] = useState<CompleteEventResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentCosmeticIndex, setCurrentCosmeticIndex] = useState(0);

  // Animations
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.5);
  const cardScale = useSharedValue(0);
  const cardRotateY = useSharedValue(180);
  const levelUpScale = useSharedValue(0);
  const cosmeticScale = useSharedValue(0);
  const titleBannerY = useSharedValue(-100);
  const coinScale = useSharedValue(0);

  useEffect(() => {
    runSequence();
  }, []);

  async function runSequence() {
    // Phase 1: Particles
    particleOpacity.value = withTiming(1, { duration: 600 });
    particleScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    let result: CompleteEventResult;
    try {
      result = await completeEvent(id!);
      setRewardData(result);
    } catch (err) {
      console.error('Failed to complete event:', err);
      setError(err instanceof Error ? err.message : '보상을 불러오지 못했습니다.');
      setPhase('done');
      return;
    }

    await sleep(400);

    // Phase 2: Card reveal
    setPhase('reveal');
    fireImpactHeavy();
    cardScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    await sleep(400);
    cardRotateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    await sleep(800);
    fireNotificationSuccess();

    // Phase 3: XP counter
    setPhase('xp');
    const xpAmount = result.rewards.xp_earned;
    await animateCounter(xpAmount, setXpDisplayed, 20);
    await sleep(400);

    // Phase 4: Coins
    const coinsAmount = result.rewards.coins_earned ?? 0;
    if (coinsAmount > 0) {
      setPhase('coins');
      coinScale.value = withSpring(1, { damping: 8, stiffness: 120 });
      fireImpactMedium();
      await animateCounter(coinsAmount, setCoinsDisplayed, 15);
      await sleep(600);
    }

    // Phase 5: Cosmetic drops
    const cosmetics = result.rewards.cosmetics_dropped ?? [];
    if (cosmetics.length > 0) {
      for (let i = 0; i < cosmetics.length; i++) {
        setCurrentCosmeticIndex(i);
        setPhase('cosmetic');
        cosmeticScale.value = 0;

        const rarity = cosmetics[i].rarity;
        if (rarity === 'legendary') {
          fireNotificationSuccess();
          await sleep(200);
          fireImpactHeavy();
          await sleep(200);
          fireImpactHeavy();
        } else if (rarity === 'epic') {
          fireImpactHeavy();
        } else if (rarity === 'rare') {
          fireImpactMedium();
        } else {
          fireImpactLight();
        }

        cosmeticScale.value = withSpring(1, { damping: 6, stiffness: 90 });
        await sleep(rarity === 'legendary' ? 3000 : rarity === 'epic' ? 2000 : 1500);
      }
    }

    // Phase 6: Titles
    const titles = result.rewards.titles_earned ?? [];
    if (titles.length > 0) {
      setPhase('title');
      titleBannerY.value = withSpring(0, { damping: 10, stiffness: 100 });
      fireNotificationSuccess();
      await sleep(2500);
    }

    // Phase 7: Personality
    if (result.character?.personality_updated && result.character.new_traits) {
      setPhase('personality');
      fireImpactMedium();
      await sleep(2500);
    }

    // Phase 8: Level up
    if (result.character?.level_up) {
      setPhase('levelup');
      fireNotificationSuccess();
      levelUpScale.value = withSpring(1, { damping: 6, stiffness: 80 });
      await sleep(2500);
      await fetchCharacter({ skipEvolutionCelebration: true });
    }

    // Refresh cosmetic data
    fetchLoadout();
    fetchCoins();
    prepareShare(id!, '탐험', result);
    setPhase('done');
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function animateCounter(
    target: number,
    setter: (v: number) => void,
    steps: number,
  ) {
    for (let i = 1; i <= steps; i++) {
      await sleep(30);
      setter(Math.round((i / steps) * target));
    }
  }

  // ── Animation styles ────────────────────────────────────────────────

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

  const cosmeticStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cosmeticScale.value }],
    opacity: cosmeticScale.value,
  }));

  const titleBannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleBannerY.value }],
  }));

  const coinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
    opacity: coinScale.value,
  }));

  // ── Derived values ─────────────────────────────────────────────────

  const firstBadge = rewardData?.rewards.badges_earned[0];
  const cardRarity = firstBadge?.rarity ?? 'common';
  const cardEmoji = firstBadge ? '🏅' : '⚡';
  const cardName = firstBadge?.name ?? `${rewardData?.rewards.xp_earned ?? 0} XP 획득`;
  const cardDesc = firstBadge ? '새로운 배지를 획득했습니다!' : '미션을 완료했습니다!';
  const rarityGradient = RARITY_GRADIENTS[cardRarity] ?? RARITY_GRADIENTS.common;

  const currentCosmetic: CosmeticDropResult | undefined =
    rewardData?.rewards.cosmetics_dropped?.[currentCosmeticIndex];

  return (
    <View style={styles.container}>
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
                { top: `${20 + (i * 8) % 50}%`, left: `${10 + (i * 13) % 75}%`, fontSize: 16 + (i % 4) * 6 },
              ]}
            >
              {p}
            </Animated.Text>
          ))}
        </Animated.View>
      )}

      {/* Error */}
      {error && phase === 'done' && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.ctaBtn} onPress={() => router.replace('/(tabs)/map')}>
            <Text style={styles.ctaBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      )}

      {/* Reward card */}
      {!error && ['reveal', 'xp', 'coins', 'done'].includes(phase) && (
        <View style={styles.cardCenter}>
          <Animated.View style={[styles.card, cardStyle]}>
            <LinearGradient colors={rarityGradient} style={styles.cardGradient}>
              <Text style={styles.cardRarity}>{RARITY_LABELS[cardRarity]}</Text>
              <Text style={styles.cardEmoji}>{cardEmoji}</Text>
              <Text style={styles.cardName}>{cardName}</Text>
              <Text style={styles.cardDesc}>{cardDesc}</Text>
              <Text style={styles.cardAcquired}>획득!</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* XP float */}
      {!error && ['xp', 'coins', 'done'].includes(phase) && (
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.xpFloat}>
          <Text style={styles.xpFloatText}>+{xpDisplayed} XP</Text>
        </Animated.View>
      )}

      {/* Coins float */}
      {!error && phase === 'coins' && (
        <Animated.View style={[styles.coinFloat, coinAnimStyle]}>
          <Text style={styles.coinFloatText}>+{coinsDisplayed} 🪙</Text>
        </Animated.View>
      )}

      {/* Cosmetic drop */}
      {!error && phase === 'cosmetic' && currentCosmetic && (
        <View style={styles.cosmeticOverlay}>
          <Animated.View style={[styles.cosmeticCard, cosmeticStyle]}>
            <View style={[styles.cosmeticGlow, { shadowColor: RARITY_GLOW[currentCosmetic.rarity] ?? RARITY_GLOW.common }]} />
            <LinearGradient
              colors={RARITY_GRADIENTS[currentCosmetic.rarity] ?? RARITY_GRADIENTS.common}
              style={styles.cosmeticGradient}
            >
              {currentCosmetic.rarity === 'legendary' && (
                <Animated.Text entering={FadeIn.delay(300)} style={styles.cosmeticSpecialLabel}>
                  ★ 레전더리 ★
                </Animated.Text>
              )}
              {currentCosmetic.rarity === 'epic' && (
                <Animated.Text entering={FadeIn.delay(200)} style={styles.cosmeticSpecialLabel}>
                  에픽!!
                </Animated.Text>
              )}
              {currentCosmetic.rarity === 'rare' && (
                <Animated.Text entering={FadeIn.delay(200)} style={styles.cosmeticRareLabel}>
                  레어 아이템!
                </Animated.Text>
              )}
              <Text style={styles.cosmeticEmoji}>{currentCosmetic.preview_emoji}</Text>
              <Text style={styles.cosmeticName}>{currentCosmetic.name}</Text>
              <View style={styles.cosmeticSlotBadge}>
                <Text style={styles.cosmeticSlotText}>{currentCosmetic.slot.toUpperCase()}</Text>
              </View>
              <Text style={styles.cosmeticRarity}>{RARITY_LABELS[currentCosmetic.rarity]}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Particles for cosmetic */}
          {['legendary', 'epic'].includes(currentCosmetic.rarity) &&
            Array.from({ length: currentCosmetic.rarity === 'legendary' ? 12 : 6 }).map((_, i) => (
              <Animated.Text
                key={`cp-${i}`}
                entering={FadeIn.delay(i * 80)}
                style={[
                  styles.cosmeticParticle,
                  {
                    top: `${15 + Math.random() * 60}%`,
                    left: `${5 + Math.random() * 85}%`,
                    fontSize: 12 + Math.random() * 16,
                  },
                ]}
              >
                {currentCosmetic.rarity === 'legendary' ? '⭐' : '✨'}
              </Animated.Text>
            ))}
        </View>
      )}

      {/* Title earned */}
      {!error && phase === 'title' && rewardData?.rewards.titles_earned && (
        <View style={styles.titleOverlay}>
          <Animated.View style={[styles.titleBanner, titleBannerStyle]}>
            <Text style={styles.titleBannerIcon}>🏅</Text>
            <Text style={styles.titleBannerLabel}>새로운 칭호 획득!</Text>
            {rewardData.rewards.titles_earned.map((title) => (
              <View key={title.id} style={styles.titleItem}>
                <Text style={styles.titleName}>"{title.name}"</Text>
                <View style={[styles.titleRarityBadge, { backgroundColor: (RARITY_GRADIENTS[title.rarity] ?? RARITY_GRADIENTS.common)[0] }]}>
                  <Text style={styles.titleRarityText}>{RARITY_LABELS[title.rarity]}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>
      )}

      {/* Personality update */}
      {!error && phase === 'personality' && rewardData?.character?.new_traits && (
        <View style={styles.personalityOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.personalityCard}>
            <View style={styles.personalityIcon}>
              <CharacterAvatar
                characterType={character?.character_type ?? 'explorer'}
                level={character?.level ?? 1}
                size={72}
                showLoadoutOverlay={false}
                interactive={false}
                borderColor={COLORS.primary}
                backgroundColor={COLORS.surface}
              />
            </View>
            <Text style={styles.personalityTitle}>
              {character?.name ?? '캐릭터'}의 성격이 변했어요!
            </Text>
            <View style={styles.traitRow}>
              {rewardData.character.new_traits.map((trait, i) => (
                <Animated.View key={trait} entering={FadeIn.delay(i * 200)} style={styles.traitBadge}>
                  <Text style={styles.traitText}>
                    {trait === '야행성' ? '🌙' : trait === '시각적 탐험가' ? '📸' : trait === '박학다식' ? '🎓' : trait === '장거리 러너' ? '🏃' : '✨'}
                    {' '}{trait}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        </View>
      )}

      {/* Level up */}
      {phase === 'levelup' && rewardData?.character && (
        <Animated.View style={[styles.levelUpOverlay, levelUpStyle]}>
          <View style={styles.levelUpContent}>
            <View style={styles.levelUpEmoji}>
              <CharacterAvatar
                characterType={character?.character_type ?? 'explorer'}
                level={rewardData.character.new_level}
                size={88}
                showLoadoutOverlay={false}
                interactive={false}
                borderColor={COLORS.primary}
                backgroundColor={COLORS.surface}
              />
            </View>
            <Text style={styles.levelUpTitle}>레벨 업!</Text>
            <Text style={styles.levelUpLevel}>Lv.{rewardData.character.new_level} 달성!</Text>
            <Text style={styles.levelUpSubtitle}>
              {character ? getLevelTitle(character.character_type, rewardData.character.new_level) : '탐험가'}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* CTA */}
      {!error && phase === 'done' && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.footer}>
          {/* Summary */}
          {rewardData && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItem}>⚡ {rewardData.rewards.xp_earned} XP</Text>
              {(rewardData.rewards.coins_earned ?? 0) > 0 && (
                <Text style={styles.summaryItem}>🪙 {rewardData.rewards.coins_earned}</Text>
              )}
              {rewardData.rewards.cosmetics_dropped?.length > 0 && (
                <Text style={styles.summaryItem}>🎁 {rewardData.rewards.cosmetics_dropped.length}</Text>
              )}
              {rewardData.rewards.titles_earned?.length > 0 && (
                <Text style={styles.summaryItem}>🏅 {rewardData.rewards.titles_earned.length}</Text>
              )}
            </View>
          )}

          {/* Cosmetic quick-equip CTA */}
          {rewardData?.rewards.cosmetics_dropped && rewardData.rewards.cosmetics_dropped.length > 0 && (
            <Pressable
              style={styles.equipCtaBtn}
              onPress={() => {
                fireImpactMedium();
                router.push('/character/customize');
              }}
            >
              <Ionicons name="shirt-outline" size={18} color="#FFF" />
              <Text style={styles.equipCtaBtnText}>장착하러 가기</Text>
            </Pressable>
          )}

          {shareReady && (
            <Pressable
              style={styles.shareCtaBtn}
              onPress={() => {
                fireImpactMedium();
                setShowShareModal(true);
              }}
            >
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareCtaBtnText}>탐험 일지 공유하기</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              fireImpactMedium();
              router.replace('/(tabs)/map');
            }}
          >
            <Text style={styles.ctaBtnText}>계속 탐험하기</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Share modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        {shareData && (
          <ShareJournalCard data={shareData} onClose={() => setShowShareModal(false)} />
        )}
      </Modal>
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
  particleContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  particle: { position: 'absolute' },

  // ── Error ──
  errorContainer: { zIndex: 5, alignItems: 'center', gap: SPACING.lg, paddingHorizontal: SPACING.xl },
  errorText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  // ── Card ──
  cardCenter: { zIndex: 2, alignItems: 'center' },
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
  cardEmoji: { fontSize: 72, marginBottom: SPACING.xl },
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
  xpFloat: { position: 'absolute', bottom: '30%', zIndex: 3 },
  xpFloatText: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.primary,
    textShadowColor: 'rgba(108,92,231,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Coins Float ──
  coinFloat: { position: 'absolute', bottom: '24%', zIndex: 3 },
  coinFloatText: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#F0C040',
    textShadowColor: 'rgba(240,192,64,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Cosmetic Drop ──
  cosmeticOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cosmeticCard: {
    width: SCREEN_W * 0.75,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cosmeticGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: BORDER_RADIUS.xl + 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  cosmeticGradient: {
    padding: SPACING.xxxl,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
  },
  cosmeticSpecialLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
    letterSpacing: 3,
    marginBottom: SPACING.lg,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  cosmeticRareLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
    marginBottom: SPACING.md,
  },
  cosmeticEmoji: { fontSize: 80, marginBottom: SPACING.xl },
  cosmeticName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  cosmeticSlotBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  cosmeticSlotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  cosmeticRarity: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.9)',
  },
  cosmeticParticle: { position: 'absolute', zIndex: 11 },

  // ── Title ──
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  titleBanner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
    width: SCREEN_W * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  titleBannerIcon: { fontSize: 56, marginBottom: SPACING.md },
  titleBannerLabel: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#F0C040',
    marginBottom: SPACING.xl,
  },
  titleItem: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  titleRarityBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  titleRarityText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // ── Personality ──
  personalityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  personalityCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxxl,
    alignItems: 'center',
    width: SCREEN_W * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  personalityIcon: { marginBottom: SPACING.md, alignItems: 'center' },
  personalityTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  traitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  traitBadge: {
    backgroundColor: 'rgba(108,92,231,0.3)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.5)',
  },
  traitText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
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
  levelUpEmoji: { marginBottom: SPACING.xl, alignItems: 'center' },
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  equipCtaBtn: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  equipCtaBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  shareCtaBtn: {
    flexDirection: 'row',
    backgroundColor: '#E1306C',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  shareCtaBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
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
