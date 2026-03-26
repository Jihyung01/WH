import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
  getLevelTitle,
  getNextEvolutionLevel,
  type GrowthStats,
} from '../../src/stores/characterStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useInventoryStore } from '../../src/stores/inventoryStore';
import { CharacterClass, District } from '../../src/types/enums';
import { formatRelativeDate, formatNumber } from '../../src/utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';

type ProfileTab = 'overview' | 'social';

const CLASS_GRADIENTS: Record<CharacterClass, string[]> = {
  [CharacterClass.EXPLORER]:  ['#00D68F', '#009B6A'],
  [CharacterClass.FOODIE]:    ['#48DBFB', '#0ABDE3'],
  [CharacterClass.ARTIST]:    ['#F0C040', '#EE9A00'],
  [CharacterClass.SOCIALITE]: ['#7EE8CA', '#2DD4A8'],
};

const STAT_LABELS: { key: keyof GrowthStats; label: string; icon: string }[] = [
  { key: 'exploration', label: '탐험력', icon: '🧭' },
  { key: 'discovery',   label: '발견력', icon: '🔍' },
  { key: 'knowledge',   label: '지식력', icon: '📚' },
  { key: 'connection',  label: '교류력', icon: '🤝' },
  { key: 'creativity',  label: '창의력', icon: '🎨' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const { character, growthStats, recentXpGains, weekActivity, initializeMockCharacter } = useCharacterStore();
  const { stats, achievements, friends, leaderboard, myRank, visitedLocations, initializeMockData, fetchLeaderboard } = useProfileStore();
  const { signOut } = useAuthStore();
  const { badges } = useInventoryStore();

  useEffect(() => {
    initializeMockCharacter();
    initializeMockData();
  }, []);

  const floatY = useSharedValue(0);
  const charScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: charScale.value }],
  }));

  const handleCharacterTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    charScale.value = withSequence(
      withSpring(1.15, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
  }, []);

  const handleSignOut = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try { await signOut(); } catch {}
  }, []);

  if (!character) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>🧑‍🚀</Text>
        <Text style={styles.loadingText}>프로필 로딩 중...</Text>
      </View>
    );
  }

  const stage = getEvolutionStage(character.level);
  const emoji = getEvolutionEmoji(character.characterClass, stage);
  const title = getLevelTitle(character.characterClass, character.level);
  const gradient = CLASS_GRADIENTS[character.characterClass] ?? CLASS_GRADIENTS[CharacterClass.EXPLORER];
  const nextEvo = getNextEvolutionLevel(character.level);
  const xpPercent = character.requiredXp > 0 ? Math.min((character.currentXp / character.requiredXp) * 100, 100) : 0;
  const maxStat = Math.max(...Object.values(growthStats), 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Profile Header ── */}
      <LinearGradient colors={[gradient[0] + '30', COLORS.background]} style={styles.heroSection}>
        <View style={styles.heroHeader}>
          <View style={{ width: 40 }} />
          <Pressable
            style={styles.editBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Avatar + character */}
        <Pressable onPress={handleCharacterTap}>
          <Animated.View style={[styles.avatarContainer, floatStyle]}>
            <View style={[styles.avatarCircle, { borderColor: gradient[0] }]}>
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: gradient[0] }]}>
              <Text style={styles.levelBadgeText}>Lv.{character.level}</Text>
            </View>
          </Animated.View>
        </Pressable>

        <Text style={styles.username}>{character.name}</Text>
        <Text style={[styles.titleText, { color: gradient[0] }]}>{title}</Text>

        {/* XP bar */}
        <View style={styles.xpBar}>
          <View style={styles.xpBarHeader}>
            <Text style={styles.xpLabel}>Lv.{character.level} → Lv.{character.level + 1}</Text>
            <Text style={styles.xpNumbers}>{formatNumber(character.currentXp)} / {formatNumber(character.requiredXp)} XP</Text>
          </View>
          <View style={styles.xpBarTrack}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
          </View>
        </View>

        {nextEvo && (
          <View style={styles.evoPreview}>
            <Ionicons name="sparkles" size={14} color={COLORS.primaryLight} />
            <Text style={styles.evoText}>다음 진화까지 {nextEvo - character.level}레벨!</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Activity Stats Grid (2x2) ── */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
        <View style={styles.statsGrid2x2}>
          <StatCard emoji="🏁" value={`${stats.totalEvents}개`} label="총 탐험" />
          <StatCard emoji="📏" value={`${stats.totalDistanceKm}km`} label="총 거리" />
          <StatCard emoji="🏅" value={`${stats.totalBadges}개`} label="수집 배지" />
          <StatCard emoji="📆" value={`${stats.explorationDays}일`} label="탐험 일수" />
        </View>
      </Animated.View>

      {/* ── Tab Selector ── */}
      <View style={styles.tabRow}>
        {(['overview', 'social'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'overview' ? '나의 활동' : '소셜'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'overview' ? (
        <>
          {/* ── Activity Map Preview ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>나의 탐험 지도</Text>
              <Text style={styles.sectionBadge}>나의 발자취</Text>
            </View>
            <Pressable style={styles.miniMapCard}>
              <View style={styles.miniMap}>
                {visitedLocations.slice(0, 30).map((loc, i) => {
                  const nx = ((loc.location.longitude - 126.93) / 0.1) * 100;
                  const ny = ((37.59 - loc.location.latitude) / 0.06) * 100;
                  const opacity = 0.4 + Math.min(0.6, (30 - i) / 30);
                  return (
                    <View
                      key={loc.id}
                      style={[styles.mapDot, {
                        left: `${Math.min(95, Math.max(5, nx))}%`,
                        top: `${Math.min(90, Math.max(5, ny))}%`,
                        opacity,
                        backgroundColor: gradient[0],
                      }]}
                    />
                  );
                })}
                <View style={styles.miniMapOverlay}>
                  <Ionicons name="map-outline" size={20} color={COLORS.textMuted} />
                  <Text style={styles.miniMapText}>{visitedLocations.length}곳 방문</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* ── Growth Stats ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>성장 능력치</Text>
            <View style={styles.statsBarList}>
              {STAT_LABELS.map(({ key, label, icon }) => {
                const val = growthStats[key];
                const pct = (val / maxStat) * 100;
                return (
                  <View key={key} style={styles.statRow}>
                    <Text style={styles.statIcon}>{icon}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                    <View style={styles.statBarTrack}>
                      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.statBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.statValue}>{val}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Achievements ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>업적</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScroll}>
              {achievements.map((ach, i) => (
                <Animated.View key={ach.id} entering={FadeInRight.delay(i * 60)}>
                  <View style={[styles.achievementCard, !ach.isUnlocked && styles.achievementLocked]}>
                    <Text style={styles.achievementEmoji}>{ach.emoji}</Text>
                    <Text style={styles.achievementName} numberOfLines={1}>{ach.name}</Text>
                    {ach.isUnlocked ? (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    ) : (
                      <Text style={styles.achievementProgress}>{ach.progress}/{ach.target}</Text>
                    )}
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* ── Weekly Activity ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>활동 기록</Text>
            <View style={styles.activityGrid}>
              {weekActivity.map((day) => {
                const intensity = day.count === 0 ? 0 : Math.min(day.count / 4, 1);
                const bgColor = day.count === 0 ? COLORS.surfaceHighlight : `rgba(108,92,231,${0.2 + intensity * 0.8})`;
                return <View key={day.date} style={[styles.activityCell, { backgroundColor: bgColor }]} />;
              })}
            </View>
            <View style={styles.activityLegend}>
              <Text style={styles.legendText}>적음</Text>
              <View style={styles.legendScale}>
                {[0, 0.3, 0.6, 1].map((v, i) => (
                  <View key={i} style={[styles.legendCell, { backgroundColor: v === 0 ? COLORS.surfaceHighlight : `rgba(108,92,231,${0.2 + v * 0.8})` }]} />
                ))}
              </View>
              <Text style={styles.legendText}>많음</Text>
            </View>
          </View>

          {/* ── Recent XP ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>최근 획득 XP</Text>
            {recentXpGains.slice(0, 4).map((entry) => (
              <View key={entry.id} style={styles.xpEntry}>
                <View style={styles.xpEntryLeft}>
                  <Text style={styles.xpEntryIcon}>⚡</Text>
                  <View>
                    <Text style={styles.xpEntrySource}>{entry.source}</Text>
                    <Text style={styles.xpEntryTime}>{formatRelativeDate(entry.timestamp)}</Text>
                  </View>
                </View>
                <Text style={styles.xpEntryAmount}>+{entry.amount} XP</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* ── Friends ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>친구</Text>
              <Text style={styles.sectionSubCount}>{friends.length}명</Text>
            </View>
            {friends.length > 0 ? (
              friends.map((friend, i) => (
                <Animated.View key={friend.id} entering={FadeInDown.delay(i * 60)}>
                  <View style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{friend.nickname[0]}</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <View style={styles.friendNameRow}>
                        <Text style={styles.friendName}>{friend.nickname}</Text>
                        <Text style={styles.friendLevel}>Lv.{friend.level}</Text>
                      </View>
                      <View style={styles.friendMeta}>
                        <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                        <Text style={styles.friendDistrict}>{friend.lastDistrict}</Text>
                        <Text style={styles.friendDot}>·</Text>
                        <Text style={styles.friendTime}>{formatRelativeDate(friend.lastActiveAt)}</Text>
                      </View>
                      {friend.recentActivity && (
                        <Text style={styles.friendActivity} numberOfLines={1}>{friend.recentActivity}</Text>
                      )}
                    </View>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyText}>WhereHere를 사용하는 카카오 친구가 없어요</Text>
              </View>
            )}
          </View>

          {/* ── Leaderboard ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>리더보드</Text>

            {/* Scope toggle */}
            <View style={styles.lbScopeRow}>
              {(['weekly', 'district'] as const).map((scope) => (
                <Pressable
                  key={scope}
                  style={[styles.lbScopeBtn, leaderboard.length > 0 && useProfileStore.getState().leaderboardScope === scope && styles.lbScopeBtnActive]}
                  onPress={() => fetchLeaderboard(scope, scope === 'district' ? District.SEONGSU : undefined)}
                >
                  <Text style={[styles.lbScopeText, useProfileStore.getState().leaderboardScope === scope && styles.lbScopeTextActive]}>
                    {scope === 'weekly' ? '주간 XP' : '지역 랭킹'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* My rank */}
            {myRank != null && (
              <View style={styles.myRankCard}>
                <Text style={styles.myRankLabel}>내 순위</Text>
                <Text style={styles.myRankValue}>#{myRank}</Text>
              </View>
            )}

            {/* Top entries */}
            {leaderboard.slice(0, 10).map((entry, i) => (
              <Animated.View key={entry.userId} entering={FadeInDown.delay(i * 40)}>
                <View style={[styles.lbRow, entry.isMe && styles.lbRowMe]}>
                  <Text style={[styles.lbRank, i < 3 && styles.lbRankTop]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${entry.rank}`}
                  </Text>
                  <View style={styles.lbAvatar}>
                    <Text style={styles.lbAvatarText}>{entry.nickname[0]}</Text>
                  </View>
                  <View style={styles.lbInfo}>
                    <Text style={[styles.lbName, entry.isMe && styles.lbNameMe]}>{entry.nickname}</Text>
                    <Text style={styles.lbLevel}>Lv.{entry.level}</Text>
                  </View>
                  <Text style={styles.lbXp}>{formatNumber(entry.weeklyXp)} XP</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </>
      )}

      {/* ── Settings Section ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="notifications-outline" label="알림 설정" onPress={() => router.push('/settings')} />
          <SettingsRow icon="location-outline" label="위치 권한 관리" onPress={() => router.push('/settings')} />
          <SettingsRow icon="language-outline" label="언어 설정" value="한국어" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="document-text-outline" label="개인정보 처리방침" onPress={() => {}} />
          <SettingsRow icon="reader-outline" label="이용약관" onPress={() => {}} />
          <SettingsRow icon="information-circle-outline" label="앱 버전" value="1.0.0" />
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ── Stat Card Helper ── */
function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat2x2Card}>
      <Text style={styles.stat2x2Emoji}>{emoji}</Text>
      <Text style={styles.stat2x2Value}>{value}</Text>
      <Text style={styles.stat2x2Label}>{label}</Text>
    </View>
  );
}

/* ── Settings Row Helper ── */
function SettingsRow({ icon, label, value, onPress }: {
  icon: string; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={18} color={COLORS.textSecondary} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={styles.settingsRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  loadingEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  loadingText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  // ── Hero ──
  heroSection: { paddingTop: 56, paddingBottom: SPACING.xl, alignItems: 'center' },
  heroHeader: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  editBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(15,19,34,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarContainer: { marginBottom: SPACING.md, position: 'relative' },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, ...SHADOWS.lg,
  },
  avatarEmoji: { fontSize: 48 },
  levelBadge: {
    position: 'absolute', bottom: -4, right: -4,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  levelBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  username: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 2 },
  titleText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.lg },

  xpBar: { width: '100%', paddingHorizontal: SPACING.xl },
  xpBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  xpLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  xpNumbers: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  xpBarTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  evoPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm,
  },
  evoText: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.medium },

  // ── 2x2 Stats ──
  statsGrid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
  stat2x2Card: {
    width: '47%', backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', gap: 4,
  },
  stat2x2Emoji: { fontSize: 24 },
  stat2x2Value: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  stat2x2Label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  // ── Tab Selector ──
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.xl, gap: SPACING.sm, marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.textPrimary },

  // ── Section ──
  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  sectionBadge: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primaryLight,
    backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },
  sectionSubCount: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },

  // ── Mini Map ──
  miniMapCard: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden', height: 160,
  },
  miniMap: { flex: 1, position: 'relative' },
  mapDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  miniMapOverlay: {
    position: 'absolute', bottom: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,14,26,0.7)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm,
  },
  miniMapText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  // ── Growth Stats Bars ──
  statsBarList: { gap: SPACING.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statIcon: { fontSize: 18, width: 24 },
  statLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 48 },
  statBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, width: 28, textAlign: 'right' },

  // ── Achievements ──
  achievementScroll: { gap: SPACING.md },
  achievementCard: {
    width: 100, alignItems: 'center', padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  achievementLocked: { opacity: 0.4 },
  achievementEmoji: { fontSize: 28 },
  achievementName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, textAlign: 'center' },
  achievementProgress: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  // ── Activity Grid ──
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  activityCell: { width: 18, height: 18, borderRadius: 3 },
  activityLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.sm },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  legendScale: { flexDirection: 'row', gap: 3 },
  legendCell: { width: 14, height: 14, borderRadius: 2 },

  // ── XP Entries ──
  xpEntry: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  xpEntryLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  xpEntryIcon: { fontSize: 20 },
  xpEntrySource: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.medium },
  xpEntryTime: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  xpEntryAmount: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },

  // ── Friends ──
  friendCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.sm,
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  friendInfo: { flex: 1 },
  friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  friendName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  friendLevel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primaryLight },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  friendDistrict: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  friendDot: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  friendTime: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  friendActivity: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },

  // ── Empty ──
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },

  // ── Leaderboard ──
  lbScopeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  lbScopeBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight,
  },
  lbScopeBtnActive: { backgroundColor: COLORS.primary },
  lbScopeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  lbScopeTextActive: { color: COLORS.textPrimary },
  myRankCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '20', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  myRankLabel: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  myRankValue: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.primary },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceHighlight,
  },
  lbRowMe: { backgroundColor: COLORS.primary + '10', borderRadius: BORDER_RADIUS.sm, marginHorizontal: -SPACING.sm, paddingHorizontal: SPACING.md },
  lbRank: { width: 28, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, textAlign: 'center' },
  lbRankTop: { fontSize: FONT_SIZE.lg },
  lbAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  lbAvatarText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryLight },
  lbInfo: { flex: 1 },
  lbName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  lbNameMe: { color: COLORS.primary },
  lbLevel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  lbXp: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.warning },

  // ── Settings ──
  settingsGroup: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceHighlight,
  },
  settingsLabel: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  settingsValue: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight, marginTop: SPACING.md,
  },
  logoutText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.error },
});
