import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { claimDailyReward, getStreakInfo } from '../../lib/api';
import type { DailyRewardResult, StreakInfo } from '../../lib/api';
import { useCharacterStore } from '../../stores/characterStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, BRAND } from '../../config/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MILESTONE_EMOJIS: Record<string, string> = {
  streak_7: '🔥',
  streak_30: '🏆',
  streak_100: '👑',
};

export default function DailyRewardModal({ visible, onClose }: Props) {
  const fetchCoins = useCharacterStore((s) => s.fetchCoins);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [result, setResult] = useState<DailyRewardResult | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const buttonScale = useSharedValue(1);
  const xpScale = useSharedValue(0);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
    opacity: xpScale.value,
  }));

  useEffect(() => {
    if (visible) {
      loadStreakInfo();
    }
  }, [visible]);

  const loadStreakInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getStreakInfo();
      setStreakInfo(info);
    } catch (err) {
      console.warn('Failed to load streak info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = useCallback(async () => {
    if (isClaiming || streakInfo?.claimed_today) return;

    setIsClaiming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1.05),
      withSpring(1),
    );

    try {
      const reward = await claimDailyReward();
      setResult(reward);

      if (!reward.already_claimed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        xpScale.value = withSpring(1, { damping: 6, stiffness: 100 });

        // Reload streak info & sync coins
        const info = await getStreakInfo();
        setStreakInfo(info);
        fetchCoins();
      }
    } catch (err) {
      console.warn('Claim daily reward error:', err);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, streakInfo]);

  const handleClose = () => {
    setResult(null);
    xpScale.value = 0;
    onClose();
  };

  const alreadyClaimed = streakInfo?.claimed_today || result?.already_claimed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>일일 보상</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={BRAND.primary} size="large" style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Streak display */}
              <View style={styles.streakSection}>
                <Text style={styles.streakEmoji}>
                  {(streakInfo?.current_streak ?? 0) >= 7 ? '🔥' : '📅'}
                </Text>
                <Text style={styles.streakNumber}>{streakInfo?.current_streak ?? 0}일</Text>
                <Text style={styles.streakLabel}>연속 출석</Text>
              </View>

              {/* Weekly progress */}
              <View style={styles.weekRow}>
                {WEEK_DAYS.map((day, i) => {
                  const filled = i < (streakInfo?.weekly_progress ?? 0);
                  return (
                    <View key={day} style={styles.dayCol}>
                      <View
                        style={[
                          styles.dayCircle,
                          filled && styles.dayCircleFilled,
                        ]}
                      >
                        {filled ? (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        ) : (
                          <Text style={styles.dayText}>{day}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Milestone progress */}
              {streakInfo && (
                <View style={styles.milestoneRow}>
                  <Text style={styles.milestoneText}>
                    다음 마일스톤: {streakInfo.next_milestone}일
                    ({streakInfo.days_until_milestone}일 남음)
                  </Text>
                  <Text style={styles.milestoneBonus}>
                    +{streakInfo.next_milestone_bonus} XP
                  </Text>
                </View>
              )}

              {/* Claim result */}
              {result && !result.already_claimed && (
                <Animated.View entering={FadeInUp.springify()} style={styles.resultBox}>
                  <Animated.View style={[styles.xpBurst, xpStyle]}>
                    <Text style={styles.xpBurstText}>+{result.xp_earned} XP</Text>
                    {!!result.coins_earned && (
                      <Text style={styles.coinText}>+{result.coins_earned} 🪙</Text>
                    )}
                    {result.bonus_type && (
                      <Text style={styles.bonusText}>
                        {MILESTONE_EMOJIS[result.bonus_type] ?? '🎁'} {result.message}
                      </Text>
                    )}
                  </Animated.View>
                </Animated.View>
              )}

              {/* Claim button */}
              <Animated.View style={buttonStyle}>
                <Pressable
                  style={[
                    styles.claimBtn,
                    alreadyClaimed && styles.claimBtnDisabled,
                  ]}
                  onPress={handleClaim}
                  disabled={!!alreadyClaimed || isClaiming}
                >
                  {isClaiming ? (
                    <ActivityIndicator color="#FFF" />
                  ) : alreadyClaimed ? (
                    <Text style={styles.claimBtnText}>내일 다시 오세요!</Text>
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color="#FFF" />
                      <Text style={styles.claimBtnText}>보상 받기</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  streakSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  streakEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
  },
  streakLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  dayCol: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayCircleFilled: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  dayText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },

  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  milestoneText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  milestoneBonus: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
  },

  resultBox: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  xpBurst: {
    alignItems: 'center',
  },
  xpBurstText: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.extrabold,
    color: BRAND.primary,
  },
  coinText: {
    fontSize: 24,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
    marginTop: SPACING.xs,
  },
  bonusText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND.gold,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.xs,
  },

  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: 8,
    ...SHADOWS.glow,
  },
  claimBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    shadowOpacity: 0,
  },
  claimBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
});
