import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import { useMapStore } from '../../../src/stores/mapStore';
import { useCharacterStore } from '../../../src/stores/characterStore';
import { EventStatus } from '../../../src/types/enums';
import type { NearbyEvent } from '../../../src/types/models';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../../src/config/theme';

/** Optional extras if store/API ever attach reward metadata */
type EventWithExtras = NearbyEvent & {
  rewards?: { name: string }[];
};

interface RewardItem {
  icon: string;
  label: string;
  value: string;
  color: string;
}

export default function MissionCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const visibleEvents = useMapStore((s) => s.visibleEvents);
  const setVisibleEvents = useMapStore((s) => s.setVisibleEvents);
  const addXp = useCharacterStore((s) => s.addXp);

  const event = useMemo(
    () => visibleEvents.find((e) => e.id === id) as EventWithExtras | undefined,
    [visibleEvents, id],
  );

  const [rewardsRevealed, setRewardsRevealed] = useState(false);

  // Animations
  const trophyScale = useSharedValue(0);
  const trophyRotation = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  const rewards: RewardItem[] = useMemo(() => {
    if (!event) return [];
    const xp = event.reward_xp ?? 0;
    // DB 이벤트에는 코인 필드가 없고, 완료 Edge 함수 기본값과 맞춘 추정치(난이도×20)
    const coinEstimate = Math.round((event.difficulty ?? 1) * 20);
    const items: RewardItem[] = [
      { icon: '⚡', label: 'XP', value: `+${xp}`, color: COLORS.primary },
      { icon: '🪙', label: '코인', value: `+${coinEstimate}`, color: COLORS.warning },
    ];
    const extra = event.rewards;
    if (Array.isArray(extra) && extra.length > 0 && extra[0]?.name) {
      items.push({ icon: '🎁', label: '아이템', value: extra[0].name, color: COLORS.info });
    }
    return items;
  }, [event]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    trophyScale.value = withSpring(1, { damping: 6, stiffness: 80 });
    trophyRotation.value = withSequence(
      withTiming(10, { duration: 200 }),
      withTiming(-10, { duration: 200 }),
      withTiming(5, { duration: 150 }),
      withTiming(0, { duration: 150 }),
    );
    confettiOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

    // Mark event as completed in store
    if (event) {
      const updated = visibleEvents.map((e) =>
        e.id === id ? { ...e, status: EventStatus.EXPIRED } : e,
      );
      setVisibleEvents(updated);
      addXp(event.reward_xp ?? 0);
    }

    // Reveal rewards one by one
    setTimeout(() => setRewardsRevealed(true), 800);
  }, []);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotation.value}deg` },
    ],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Confetti background */}
      <Animated.View style={[styles.confettiLayer, confettiStyle]}>
        {['🎊', '✨', '🎉', '⭐', '🌟', '💫'].map((emoji, i) => (
          <Text
            key={i}
            style={[
              styles.confettiEmoji,
              {
                top: `${15 + (i * 13) % 60}%`,
                left: `${5 + (i * 17) % 85}%`,
                fontSize: 20 + (i % 3) * 8,
                transform: [{ rotate: `${i * 45}deg` }],
              },
            ]}
          >
            {emoji}
          </Text>
        ))}
      </Animated.View>

      <View style={styles.content}>
        {/* Trophy */}
        <Animated.View style={[styles.trophyContainer, trophyStyle]}>
          <LinearGradient
            colors={[COLORS.warning, '#FF9500']}
            style={styles.trophyGradient}
          >
            <Text style={styles.trophyEmoji}>🏆</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(400)} style={styles.title}>
          미션 완료!
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(600)} style={styles.subtitle}>
          {event?.title ?? '이벤트'}을 성공적으로 완료했습니다
        </Animated.Text>

        {/* Rewards */}
        {rewardsRevealed && (
          <View style={styles.rewardsList}>
            {rewards.map((reward, i) => (
              <Animated.View
                key={reward.label}
                entering={FadeInDown.delay(i * 200).springify()}
                style={styles.rewardCard}
              >
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardLabel}>{reward.label}</Text>
                  <Text style={[styles.rewardValue, { color: reward.color }]}>
                    {reward.value}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Bottom */}
      <Animated.View entering={FadeIn.delay(1400)} style={styles.footer}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/(tabs)/map');
          }}
        >
          <Ionicons name="map-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.primaryBtnText}>지도로 돌아가기</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(tabs)/inventory')}
        >
          <Text style={styles.secondaryBtnText}>보상 확인하기</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  confettiEmoji: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 1,
  },

  // ── Trophy ──
  trophyContainer: {
    marginBottom: SPACING.xxl,
  },
  trophyGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  trophyEmoji: {
    fontSize: 56,
  },

  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },

  // ── Rewards ──
  rewardsList: {
    width: '100%',
    gap: SPACING.md,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardIcon: {
    fontSize: 32,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.glow,
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  secondaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
