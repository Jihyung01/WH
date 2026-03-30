import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
  getLevelTitle,
  getNextEvolutionLevel,
  xpForLevel,
} from '../../src/stores/characterStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useAuthStore } from '../../src/stores/authStore';
import { CharacterClass } from '../../src/types/enums';
import { formatNumber } from '../../src/utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';

const CLASS_GRADIENTS: Record<string, string[]> = {
  [CharacterClass.EXPLORER]:  ['#00D68F', '#009B6A'],
  [CharacterClass.FOODIE]:    ['#48DBFB', '#0ABDE3'],
  [CharacterClass.ARTIST]:    ['#F0C040', '#EE9A00'],
  [CharacterClass.SOCIALITE]: ['#7EE8CA', '#2DD4A8'],
};

const STAT_LABELS: { key: string; label: string; icon: string }[] = [
  { key: 'stat_exploration', label: '탐험력', icon: '🧭' },
  { key: 'stat_discovery',   label: '발견력', icon: '🔍' },
  { key: 'stat_knowledge',   label: '지식력', icon: '📚' },
  { key: 'stat_connection',  label: '교류력', icon: '🤝' },
  { key: 'stat_creativity',  label: '창의력', icon: '🎨' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { character, fetchCharacter } = useCharacterStore();
  const { stats, leaderboard, visitedLocations, myRank, fetchStats, fetchLeaderboard, fetchVisitedLocations } = useProfileStore();
  const { signOut } = useAuthStore();

  useEffect(() => {
    fetchCharacter();
    fetchStats();
    fetchVisitedLocations();
    fetchLeaderboard();
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
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch {}
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
  const emoji = getEvolutionEmoji(character.character_type, stage);
  const title = getLevelTitle(character.character_type, character.level);
  const gradient = CLASS_GRADIENTS[character.character_type] ?? CLASS_GRADIENTS[CharacterClass.EXPLORER];
  const nextEvo = getNextEvolutionLevel(character.level);
  const requiredXp = xpForLevel(character.level);
  const xpPercent = requiredXp > 0 ? Math.min((character.xp / requiredXp) * 100, 100) : 0;

  const statValues: Record<string, number> = {
    stat_exploration: character.stat_exploration,
    stat_discovery: character.stat_discovery,
    stat_knowledge: character.stat_knowledge,
    stat_connection: character.stat_connection,
    stat_creativity: character.stat_creativity,
  };
  const maxStat = Math.max(...Object.values(statValues), 1);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([fetchCharacter(), fetchStats(), fetchLeaderboard(), fetchVisitedLocations()]);
            setRefreshing(false);
          }}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Hero */}
      <LinearGradient colors={[gradient[0] + '30', COLORS.background]} style={[styles.heroSection, { paddingTop: insets.top + 12 }]}>
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
            <Text style={styles.xpNumbers}>{formatNumber(character.xp)} / {formatNumber(requiredXp)} XP</Text>
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

      {/* Activity Stats */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
        <View style={styles.statsGrid2x2}>
          <StatCard emoji="🏁" value={`${stats?.events_completed ?? 0}개`} label="총 탐험" />
          <StatCard emoji="🔥" value={`${stats?.login_streak ?? 0}일`} label="연속 기록" />
          <StatCard emoji="🏅" value={`${stats?.badges_count ?? 0}개`} label="수집 배지" />
          <StatCard emoji="📍" value={`${stats?.districts_visited?.length ?? 0}곳`} label="방문 지역" />
        </View>
      </Animated.View>

      {/* Phase 2 — 탐험 허브 (소셜·시즌·일지 등 — ROADMAP 연동 진입점) */}
      <Animated.View entering={FadeInDown.delay(80)} style={styles.section}>
        <Text style={styles.sectionTitle}>탐험 허브</Text>
        <Text style={styles.hubSubtitle}>친구·시즌·일지·프리미엄 등 새 기능으로 이동</Text>
        <View style={styles.hubGrid}>
          <HubTile
            emoji="🤝"
            label="소셜"
            desc="친구·크루·위치"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/social');
            }}
          />
          <HubTile
            emoji="🌸"
            label="시즌 패스"
            desc="보상 트랙"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/season');
            }}
          />
          <HubTile
            emoji="📔"
            label="탐험 일지"
            desc="AI 일지·공유"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/journal');
            }}
          />
          <HubTile
            emoji="⭐"
            label="프리미엄"
            desc="구독·혜택"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/premium');
            }}
          />
          <HubTile
            emoji="💬"
            label="캐릭터 채팅"
            desc="AI 대화"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/chat');
            }}
          />
          <HubTile
            emoji="✨"
            label="이벤트 제안"
            desc="UGC 생성"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/create-event');
            }}
          />
        </View>
      </Animated.View>

      {/* Growth Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성장 능력치</Text>
        <View style={styles.statsBarList}>
          {STAT_LABELS.map(({ key, label, icon }) => {
            const val = statValues[key] ?? 10;
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

      {/* Exploration Map */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>나의 탐험 지도</Text>
          <Text style={styles.sectionBadge}>나의 발자취</Text>
        </View>
        <Pressable style={styles.miniMapCard}>
          <View style={styles.miniMap}>
            {visitedLocations.slice(0, 30).map((loc, i) => {
              const nx = ((loc.lng - 126.93) / 0.1) * 100;
              const ny = ((37.59 - loc.lat) / 0.06) * 100;
              const opacity = 0.4 + Math.min(0.6, (30 - i) / 30);
              return (
                <View
                  key={loc.event_id}
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

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>리더보드</Text>

        {myRank != null && (
          <View style={styles.myRankCard}>
            <Text style={styles.myRankLabel}>내 순위</Text>
            <Text style={styles.myRankValue}>#{myRank}</Text>
          </View>
        )}

        {leaderboard.slice(0, 10).map((entry, i) => (
          <Animated.View key={entry.user_id} entering={FadeInDown.delay(i * 40)}>
            <View style={styles.lbRow}>
              <Text style={[styles.lbRank, i < 3 && styles.lbRankTop]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${entry.rank}`}
              </Text>
              <View style={styles.lbAvatar}>
                <Text style={styles.lbAvatarText}>{(entry.username ?? '?')[0]}</Text>
              </View>
              <View style={styles.lbInfo}>
                <Text style={styles.lbName}>{entry.username ?? '탐험가'}</Text>
              </View>
              <Text style={styles.lbXp}>{formatNumber(entry.weekly_xp)} XP</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="notifications-outline" label="알림 설정" onPress={() => router.push('/settings')} />
          <SettingsRow icon="location-outline" label="위치 권한 관리" onPress={() => router.push('/settings')} />
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

function HubTile({
  emoji,
  label,
  desc,
  onPress,
}: {
  emoji: string;
  label: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.hubTile, pressed && styles.hubTilePressed]} onPress={onPress}>
      <Text style={styles.hubTileEmoji}>{emoji}</Text>
      <Text style={styles.hubTileLabel}>{label}</Text>
      <Text style={styles.hubTileDesc} numberOfLines={1}>{desc}</Text>
    </Pressable>
  );
}

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat2x2Card}>
      <Text style={styles.stat2x2Emoji}>{emoji}</Text>
      <Text style={styles.stat2x2Value}>{value}</Text>
      <Text style={styles.stat2x2Label}>{label}</Text>
    </View>
  );
}

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

  heroSection: { paddingBottom: SPACING.xl, alignItems: 'center' },
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

  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  sectionBadge: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primaryLight,
    backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },

  hubSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  hubTile: {
    width: '47%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  hubTilePressed: { opacity: 0.85 },
  hubTileEmoji: { fontSize: 22, marginBottom: 4 },
  hubTileLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  hubTileDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  statsGrid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
  stat2x2Card: {
    width: '47%', backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', gap: 4,
  },
  stat2x2Emoji: { fontSize: 24 },
  stat2x2Value: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  stat2x2Label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  statsBarList: { gap: SPACING.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statIcon: { fontSize: 18, width: 24 },
  statLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 48 },
  statBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, width: 28, textAlign: 'right' },

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
  lbXp: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.warning },

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
