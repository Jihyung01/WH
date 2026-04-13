import React, { useEffect, useState, useCallback, useRef, useMemo, type ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getActiveSeason,
  claimSeasonReward,
  SEASON_MAX_LEVEL,
  SEASON_XP_PER_LEVEL,
} from '../src/lib/api';
import type { ActiveSeasonResult, SeasonInfo, SeasonPassData, SeasonReward } from '../src/lib/api';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BRAND,
  BORDER_RADIUS,
  SHADOWS,
} from '../src/config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NODE_SIZE = 56;
const NODE_GAP = 16;
const TRACK_ITEM_WIDTH = NODE_SIZE + NODE_GAP;

type IonIconName = ComponentProps<typeof Ionicons>['name'];

const PREMIUM_BENEFITS: { icon: IonIconName; text: string }[] = [
  { icon: 'color-palette', text: '프리미엄 스킨 8개' },
  { icon: 'flash', text: '추가 XP 보너스' },
  { icon: 'sparkles', text: '한정 이펙트' },
];

const REWARD_ICONS: Record<string, string> = {
  xp: '⚡',
  skin: '🎨',
  badge: '🏅',
  effect: '✨',
  item: '🎁',
  currency: '💎',
};

/** UI row: API `SeasonReward` + track + computed claimed flag */
type TrackReward = SeasonReward & {
  track: 'free' | 'premium';
  claimed: boolean;
};

function isLevelClaimed(claimedRaw: unknown, level: number): boolean {
  const key = String(level);
  if (claimedRaw == null) return false;
  if (Array.isArray(claimedRaw)) {
    return claimedRaw.some((x) => String(x) === key);
  }
  if (typeof claimedRaw === 'object') {
    return Object.prototype.hasOwnProperty.call(claimedRaw, key);
  }
  return false;
}

function buildTrackRewards(
  rows: SeasonReward[] | undefined,
  track: 'free' | 'premium',
  claimedRaw: unknown,
): Map<number, TrackReward> {
  const map = new Map<number, TrackReward>();
  for (const r of rows ?? []) {
    map.set(r.level, {
      ...r,
      track,
      claimed: isLevelClaimed(claimedRaw, r.level),
    });
  }
  return map;
}

function getDaysRemaining(endsAt: string): number {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width: number | `${number}%` | 'auto';
  height: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: BORDER_RADIUS.sm,
          backgroundColor: COLORS.surfaceLight,
        },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <SkeletonBlock width="100%" height={140} style={{ borderRadius: BORDER_RADIUS.lg }} />
      <View style={{ height: SPACING.lg }} />
      <SkeletonBlock width="60%" height={20} />
      <View style={{ height: SPACING.md }} />
      <SkeletonBlock width="100%" height={12} style={{ borderRadius: 6 }} />
      <View style={{ height: SPACING.xl }} />
      <SkeletonBlock width="100%" height={120} style={{ borderRadius: BORDER_RADIUS.lg }} />
      <View style={{ height: SPACING.lg }} />
      <View style={{ flexDirection: 'row', gap: SPACING.md }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock
            key={i}
            width={NODE_SIZE}
            height={NODE_SIZE}
            style={{ borderRadius: NODE_SIZE / 2 }}
          />
        ))}
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { padding: SPACING.lg },
});

function PulsingNode({ children, active }: { children: React.ReactNode; active: boolean }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function ClaimBurst({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 1;
      scale.value = withSpring(1.8, { damping: 6, stiffness: 120 });
      opacity.value = withDelay(400, withTiming(0, { duration: 300 }));
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    position: 'absolute' as const,
    width: NODE_SIZE + 24,
    height: NODE_SIZE + 24,
    borderRadius: (NODE_SIZE + 24) / 2,
    borderWidth: 3,
    borderColor: BRAND.primary,
    top: -12,
    left: -12,
  }));

  if (!visible) return null;
  return <Animated.View style={animStyle} />;
}

function RewardNode({
  reward,
  userLevel,
  isPremium,
  onClaim,
  claimingLevel,
}: {
  reward: TrackReward;
  userLevel: number;
  isPremium: boolean;
  onClaim: (level: number, track: 'free' | 'premium') => void;
  claimingLevel: number | null;
}) {
  const [showBurst, setShowBurst] = useState(false);
  const reachable = userLevel >= reward.level;
  const locked = reward.track === 'premium' && !isPremium;
  const claimable = reachable && !reward.claimed && !locked;
  const isClaiming = claimingLevel === reward.level;
  const icon = REWARD_ICONS[reward.type] ?? '🎁';

  const handlePress = () => {
    if (!claimable || isClaiming) return;
    setShowBurst(true);
    onClaim(reward.level, reward.track);
    setTimeout(() => setShowBurst(false), 800);
  };

  return (
    <Pressable onPress={handlePress} disabled={!claimable || isClaiming}>
      <PulsingNode active={claimable}>
        <View style={[nodeStyles.wrapper]}>
          <ClaimBurst visible={showBurst} />
          <View
            style={[
              nodeStyles.circle,
              reachable && !locked && nodeStyles.circleReachable,
              reward.claimed && nodeStyles.circleClaimed,
              locked && nodeStyles.circleLocked,
              claimable && nodeStyles.circleClaimable,
            ]}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color={BRAND.primary} />
            ) : reward.claimed ? (
              <Ionicons name="checkmark" size={22} color={BRAND.primary} />
            ) : locked ? (
              <Text style={nodeStyles.lockIcon}>🔒</Text>
            ) : (
              <Text style={nodeStyles.rewardIcon}>{icon}</Text>
            )}
          </View>
          <Text
            style={[
              nodeStyles.label,
              reward.claimed && nodeStyles.labelClaimed,
            ]}
            numberOfLines={1}
          >
            {reward.label}
          </Text>
        </View>
      </PulsingNode>
    </Pressable>
  );
}

const nodeStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: NODE_SIZE + 8,
  },
  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleReachable: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}15`,
  },
  circleClaimed: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}25`,
  },
  circleLocked: {
    borderColor: COLORS.textDisabled,
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.6,
  },
  circleClaimable: {
    borderColor: BRAND.primary,
    ...SHADOWS.glow,
  },
  lockIcon: {
    fontSize: 20,
  },
  rewardIcon: {
    fontSize: 22,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  labelClaimed: {
    color: BRAND.primary,
  },
});

function LevelNode({
  level,
  isCurrent,
  isPast,
}: {
  level: number;
  isCurrent: boolean;
  isPast: boolean;
}) {
  return (
    <View style={levelNodeStyles.wrapper}>
      <View
        style={[
          levelNodeStyles.circle,
          isPast && levelNodeStyles.circlePast,
          isCurrent && levelNodeStyles.circleCurrent,
        ]}
      >
        <Text
          style={[
            levelNodeStyles.text,
            isPast && levelNodeStyles.textPast,
            isCurrent && levelNodeStyles.textCurrent,
          ]}
        >
          {level}
        </Text>
      </View>
    </View>
  );
}

const levelNodeStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: NODE_SIZE + 8,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePast: {
    backgroundColor: `${BRAND.primary}30`,
    borderColor: BRAND.primary,
  },
  circleCurrent: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
    ...SHADOWS.glow,
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
  textPast: {
    color: BRAND.primary,
  },
  textCurrent: {
    color: '#FFF',
  },
});

function ProgressBar({
  progress,
  delay = 0,
  height = 8,
  color = BRAND.primary,
}: {
  progress: number;
  delay?: number;
  height?: number;
  color?: string;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(Math.min(progress, 1), { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, width.value * 100))}%`,
  }));

  return (
    <View style={[progressStyles.track, { height }]}>
      <Animated.View
        style={[progressStyles.fill, { backgroundColor: color, height }, animStyle]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
});

export default function SeasonPassScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trackScrollRef = useRef<ScrollView>(null);

  const [seasonResult, setSeasonResult] = useState<ActiveSeasonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  const loadSeason = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getActiveSeason();
      setSeasonResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeason();
  }, [loadSeason]);

  const hasSeasonContent = Boolean(
    seasonResult?.has_active_season && seasonResult.season && seasonResult.pass,
  );

  useEffect(() => {
    if (!hasSeasonContent || !seasonResult?.pass || !trackScrollRef.current) return;
    const lvl = seasonResult.pass.current_level;
    const offset = Math.max(0, (lvl - 2) * TRACK_ITEM_WIDTH);
    const t = setTimeout(() => {
      trackScrollRef.current?.scrollTo({ x: offset, animated: true });
    }, 500);
    return () => clearTimeout(t);
  }, [hasSeasonContent, seasonResult?.pass?.current_level]);

  const handleClaim = useCallback(
    async (level: number, _track: 'free' | 'premium') => {
      if (!seasonResult?.pass) return;
      try {
        setClaimingLevel(level);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await claimSeasonReward(level);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadSeason();
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setClaimingLevel(null);
      }
    },
    [seasonResult, loadSeason],
  );

  const daysRemaining = useMemo(() => {
    if (!seasonResult?.has_active_season || !seasonResult.season) return 0;
    return seasonResult.days_remaining ?? getDaysRemaining(seasonResult.season.end_date);
  }, [seasonResult]);

  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>활성 시즌이 없습니다</Text>
      <Text style={styles.emptyDesc}>
        새로운 시즌이 곧 시작됩니다!{'\n'}탐험을 계속하며 기다려주세요.
      </Text>
      <Pressable style={styles.retryButton} onPress={loadSeason}>
        <Ionicons name="refresh" size={18} color="#FFF" />
        <Text style={styles.retryButtonText}>새로고침</Text>
      </Pressable>
    </Animated.View>
  );

  const renderContent = () => {
    if (!seasonResult?.season || !seasonResult.pass) return null;

    const si: SeasonInfo = seasonResult.season;
    const pass: SeasonPassData = seasonResult.pass;

    const xpIntoLevel = Math.max(0, pass.season_xp - pass.current_level * SEASON_XP_PER_LEVEL);
    const levelProgress = Math.min(1, xpIntoLevel / SEASON_XP_PER_LEVEL);
    const overallProgress = Math.min(1, pass.current_level / SEASON_MAX_LEVEL);

    const freeRewardsByLevel = buildTrackRewards(si.reward_track, 'free', pass.claimed_rewards);
    const premiumRewardsByLevel = buildTrackRewards(
      si.premium_reward_track,
      'premium',
      pass.claimed_rewards,
    );

    const theme = si.theme_color || BRAND.primary;
    const bannerColors: [string, string, string] = [theme, `${theme}88`, COLORS.surface];

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Season Banner */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <LinearGradient
            colors={bannerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerLabel}>SEASON PASS</Text>
              <Text style={styles.bannerTitle}>{si.name}</Text>
              <Text style={styles.bannerDesc}>{si.description ?? ''}</Text>
            </View>
            <ProgressBar progress={overallProgress} delay={300} height={6} color="#FFF" />
            <Text style={styles.bannerProgress}>
              {Math.round(overallProgress * 100)}% 완료
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Level Indicator */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv.{pass.current_level}</Text>
            </View>
            <Text style={styles.levelLabel}>
              {pass.current_level} / {SEASON_MAX_LEVEL}
            </Text>
          </View>
          <ProgressBar progress={levelProgress} delay={500} />
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>
              {xpIntoLevel} / {SEASON_XP_PER_LEVEL} XP
            </Text>
            <Text style={styles.xpNextText}>다음 레벨까지</Text>
          </View>
        </Animated.View>

        {/* Reward Track */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>보상 트랙</Text>

          <View style={styles.trackContainer}>
            <Text style={styles.trackLabel}>무료 트랙</Text>
            <ScrollView
              ref={trackScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trackScroll}
            >
              <View>
                <View style={styles.trackRow}>
                  {Array.from({ length: SEASON_MAX_LEVEL }, (_, i) => {
                    const level = i + 1;
                    const reward = freeRewardsByLevel.get(level);
                    if (reward) {
                      return (
                        <RewardNode
                          key={`free-${level}`}
                          reward={reward}
                          userLevel={pass.current_level}
                          isPremium={pass.is_premium}
                          onClaim={handleClaim}
                          claimingLevel={claimingLevel}
                        />
                      );
                    }
                    return <View key={`free-empty-${level}`} style={styles.emptyNode} />;
                  })}
                </View>

                <View style={styles.trackRow}>
                  {Array.from({ length: SEASON_MAX_LEVEL }, (_, i) => {
                    const level = i + 1;
                    return (
                      <LevelNode
                        key={`level-${level}`}
                        level={level}
                        isCurrent={level === pass.current_level}
                        isPast={level < pass.current_level}
                      />
                    );
                  })}
                </View>

                <View style={styles.connectorLineContainer}>
                  <View
                    style={[
                      styles.connectorLine,
                      {
                        width: Math.max(
                          0,
                          (pass.current_level - 1) * TRACK_ITEM_WIDTH + NODE_SIZE / 2,
                        ),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.connectorLineBg,
                      { width: SEASON_MAX_LEVEL * TRACK_ITEM_WIDTH },
                    ]}
                  />
                </View>

                <View style={styles.trackRow}>
                  {Array.from({ length: SEASON_MAX_LEVEL }, (_, i) => {
                    const level = i + 1;
                    const reward = premiumRewardsByLevel.get(level);
                    if (reward) {
                      return (
                        <RewardNode
                          key={`premium-${level}`}
                          reward={reward}
                          userLevel={pass.current_level}
                          isPremium={pass.is_premium}
                          onClaim={handleClaim}
                          claimingLevel={claimingLevel}
                        />
                      );
                    }
                    return <View key={`prem-empty-${level}`} style={styles.emptyNode} />;
                  })}
                </View>
              </View>
            </ScrollView>
            <Text style={styles.trackLabel}>
              프리미엄 트랙 {!pass.is_premium && '🔒'}
            </Text>
          </View>
        </Animated.View>

        {!pass.is_premium && (
          <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.premiumCard}>
            <LinearGradient
              colors={['#8B5CF620', '#2DD4A820']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumHeader}>
                <Text style={styles.premiumBadge}>PREMIUM</Text>
                <Ionicons name="star" size={20} color={BRAND.gold} />
              </View>
              <Text style={styles.premiumTitle}>프리미엄 패스 업그레이드</Text>
              <View style={styles.premiumBenefits}>
                {PREMIUM_BENEFITS.map((b) => (
                  <View key={b.text} style={styles.benefitRow}>
                    <Ionicons name={b.icon} size={16} color={BRAND.primary} />
                    <Text style={styles.benefitText}>{b.text}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.premiumButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Text style={styles.premiumButtonText}>₩9,900 / 시즌</Text>
              </Pressable>
              <Text style={styles.premiumNote}>
                결제 기능은 준비 중입니다
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.statsCard}>
          <Text style={styles.statsTitle}>시즌 통계</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="flash" size={22} color="#FBBF24" />
              <Text style={styles.statBoxValue}>{pass.season_xp.toLocaleString()}</Text>
              <Text style={styles.statBoxLabel}>시즌 XP</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trophy" size={22} color={BRAND.primary} />
              <Text style={styles.statBoxValue}>
                {pass.current_level} / {SEASON_MAX_LEVEL}
              </Text>
              <Text style={styles.statBoxLabel}>시즌 레벨</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="calendar" size={22} color="#818CF8" />
              <Text style={styles.statBoxValue}>{daysRemaining}</Text>
              <Text style={styles.statBoxLabel}>남은 일수</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>시즌 패스</Text>
        {hasSeasonContent && !loading ? (
          <View style={styles.daysBadge}>
            <Ionicons name="time-outline" size={14} color={BRAND.primary} />
            <Text style={styles.daysBadgeText}>{daysRemaining}일 남음</Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : error || !hasSeasonContent ? (
        renderEmptyState()
      ) : (
        renderContent()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 80,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${BRAND.primary}30`,
  },
  daysBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.primary,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Banner
  banner: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  bannerContent: {
    marginBottom: SPACING.lg,
  },
  bannerLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
    marginBottom: SPACING.xs,
  },
  bannerDesc: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  bannerProgress: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.xs,
    textAlign: 'right',
  },

  // Level card
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  levelBadge: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  levelBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  levelLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  xpText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: BRAND.primary,
  },
  xpNextText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // Reward track
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  trackContainer: {
    marginBottom: SPACING.xl,
  },
  trackLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  trackScroll: {
    paddingRight: SPACING.xl,
  },
  trackRow: {
    flexDirection: 'row',
    gap: NODE_GAP,
    marginBottom: SPACING.sm,
    minHeight: NODE_SIZE + 20,
    alignItems: 'center',
  },
  emptyNode: {
    width: NODE_SIZE + 8,
    height: NODE_SIZE,
  },
  connectorLineContainer: {
    height: 3,
    marginVertical: SPACING.xs,
    marginHorizontal: (NODE_SIZE + 8) / 2 - 4,
    position: 'relative',
  },
  connectorLineBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 1.5,
  },
  connectorLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: BRAND.primary,
    borderRadius: 1.5,
    zIndex: 1,
  },

  // Premium CTA
  premiumCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: `${BRAND.purple}40`,
  },
  premiumGradient: {
    padding: SPACING.xl,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  premiumBadge: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
    letterSpacing: 2,
  },
  premiumTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  premiumBenefits: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  premiumButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  premiumButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  premiumNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  // Stats
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  statsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  statBoxValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statBoxLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.6,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  retryButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
});
