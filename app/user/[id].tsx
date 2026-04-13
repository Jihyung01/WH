import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  getPublicProfile,
  getUserStatsForUser,
  getUserCommunityFeed,
  getUserRecentEventActivity,
  type CommunityFeedItem,
  type PublicProfileResult,
  type UserEventActivityItem,
} from '../../src/lib/api';
import type { UserStats } from '../../src/types/models';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { useTheme } from '../../src/providers/ThemeProvider';
import { FeedPost, CommentModal } from '../(tabs)/explore';
import { reverseGeocodeToDistrict } from '../../src/utils/reverseGeocodeDistrict';
import { formatRelativeDate } from '../../src/utils/format';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND, SHADOWS } from '../../src/config/theme';
import { shareKakaoFeedCard } from '../../src/services/kakaoShare';

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<PublicProfileResult | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [feed, setFeed] = useState<CommunityFeedItem[]>([]);
  const [activity, setActivity] = useState<UserEventActivityItem[]>([]);
  const [districtLabel, setDistrictLabel] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);

  const userId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const load = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [p, st, fd, act] = await Promise.all([
          getPublicProfile(userId),
          getUserStatsForUser(userId),
          getUserCommunityFeed(userId, 30),
          getUserRecentEventActivity(userId, 10),
        ]);
        setProfile(p);
        setStats(st);
        setFeed(fd);
        setActivity(act);

        if (p.success && p.location) {
          const d = await reverseGeocodeToDistrict(p.location.latitude, p.location.longitude);
          setDistrictLabel(d);
        } else {
          setDistrictLabel(null);
        }
      } catch {
        setProfile({ success: false, error: 'load_failed' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const openEvent = useCallback(
    (eid: string) => {
      router.push(`/event/${eid}` as any);
    },
    [router],
  );

  const handleToggleLike = useCallback(async (item: CommunityFeedItem) => {
    const { toggleFeedLike } = await import('../../src/lib/api');
    const prevLiked = item.liked_by_me;
    const prevCount = item.like_count;
    setFeed((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, liked_by_me: !prevLiked, like_count: prevCount + (prevLiked ? -1 : 1) }
          : it,
      ),
    );
    try {
      const result = await toggleFeedLike(item.id);
      setFeed((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, liked_by_me: result.liked, like_count: result.like_count }
            : it,
        ),
      );
    } catch {
      setFeed((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, liked_by_me: prevLiked, like_count: prevCount } : it,
        ),
      );
    }
  }, []);

  const handleShare = useCallback(async (item: CommunityFeedItem) => {
    const typeLabel = item.submission_type === 'ugc_event_cover' ? '이벤트 커버' : '미션 인증';
    const title = item.event_title ? `${item.event_title} — ${typeLabel}` : `WhereHere ${typeLabel}`;
    const description = [
      item.username ? `${item.username}님의 ${typeLabel}` : typeLabel,
      item.event_district ?? '',
    ]
      .filter(Boolean)
      .join(' · ');
    try {
      await shareKakaoFeedCard({
        imageUrl: item.image_url,
        title,
        description,
        buttonTitle: item.event_id ? '이벤트 보기' : '앱 열기',
        linkParams: {
          iosExecutionParams: item.event_id ? { screen: 'event', id: item.event_id } : undefined,
          androidExecutionParams: item.event_id ? { screen: 'event', id: item.event_id } : undefined,
        },
      });
    } catch {
      /* */
    }
  }, []);

  const handleCommentAdded = useCallback((submissionId: string) => {
    setFeed((prev) =>
      prev.map((it) =>
        it.id === submissionId ? { ...it, comment_count: it.comment_count + 1 } : it,
      ),
    );
  }, []);

  if (!userId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.textSecondary }}>잘못된 프로필입니다.</Text>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  if (!profile || !profile.success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>뒤로</Text>
        </Pressable>
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>프로필을 불러올 수 없어요.</Text>
        </View>
      </View>
    );
  }

  const p = profile;
  const char = p.character;
  const explorer = p.explorer_type;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {p.username ?? '탐험가'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={BRAND.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxl }}
      >
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {p.avatar_url ? (
            <Image
              source={{ uri: p.avatar_url }}
              style={styles.avatarLg}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarLg, styles.avatarFallback, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="person" size={40} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.textPrimary }]}>{p.username ?? '탐험가'}</Text>
            {char ? (
              <Text style={[styles.levelLine, { color: colors.textSecondary }]}>
                Lv.{char.level} · {char.name}
              </Text>
            ) : null}
            {char?.equipped_title ? (
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>🏅 {char.equipped_title}</Text>
              </View>
            ) : null}
            {explorer?.type_name ? (
              <Text style={[styles.explorerLine, { color: BRAND.primary }]}>🧭 {explorer.type_name}</Text>
            ) : null}
            {p.location && districtLabel ? (
              <Text style={[styles.locLine, { color: colors.textMuted }]}>
                📍 {districtLabel}
                {p.location.last_seen_at ? ` · ${formatRelativeDate(p.location.last_seen_at)}` : ''}
              </Text>
            ) : null}
          </View>
          {char ? (
            <CharacterAvatar
              characterType={char.character_type}
              level={char.level}
              size={72}
              showLoadoutOverlay={false}
              interactive={false}
              borderColor={BRAND.primary}
              backgroundColor={colors.surface}
            />
          ) : null}
        </View>

        {stats ? (
          <View style={styles.statGrid}>
            <View style={[styles.statCell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.events_completed}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>총 탐험</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.badges_count}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>배지</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>{p.exploration_days}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>탐험 일수</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.login_streak}</Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>스트릭</Text>
            </View>
          </View>
        ) : null}

        {activity.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>최근 탐험</Text>
            {activity.map((a, idx) => (
              <View
                key={`${a.event_id}-${a.completed_at}-${idx}`}
                style={[styles.actRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="checkmark-circle" size={18} color={BRAND.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {a.event_title}
                  </Text>
                  <Text style={[styles.actMeta, { color: colors.textMuted }]} numberOfLines={1}>
                    {[a.district, a.address].filter(Boolean).join(' · ')} · {formatRelativeDate(a.completed_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>피드</Text>
          {feed.length === 0 ? (
            <Text style={[styles.emptyFeed, { color: colors.textMuted }]}>아직 공개 피드가 없어요.</Text>
          ) : (
            feed.map((item) => (
              <FeedPost
                key={item.id}
                item={item}
                colors={colors}
                onOpenEvent={openEvent}
                onToggleLike={handleToggleLike}
                onOpenComments={(it) => setCommentTarget(it.id)}
                onShare={handleShare}
              />
            ))
          )}
        </View>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btnPrimary, { backgroundColor: BRAND.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/shop',
                params: { giftTo: userId, giftToName: p.username ?? '친구' },
              } as any);
            }}
          >
            <Text style={styles.btnPrimaryText}>🎁 선물 보내기</Text>
          </Pressable>
          <Pressable
            style={[styles.btnGhost, { borderColor: colors.border }]}
            disabled
            onPress={() => {}}
          >
            <Text style={[styles.btnGhostText, { color: colors.textMuted }]}>함께 탐험하기 (준비 중)</Text>
          </Pressable>
        </View>
      </ScrollView>

      <CommentModal
        visible={commentTarget !== null}
        submissionId={commentTarget}
        colors={colors}
        insets={{ bottom: insets.bottom }}
        onClose={() => setCommentTarget(null)}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONT_SIZE.md },
  topTitle: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarLg: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, minWidth: 0 },
  displayName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  levelLine: { fontSize: FONT_SIZE.sm, marginTop: 2 },
  titleBadge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: `${BRAND.gold}18`,
  },
  titleBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: BRAND.gold },
  explorerLine: { fontSize: FONT_SIZE.xs, marginTop: 4, fontWeight: FONT_WEIGHT.medium },
  locLine: { fontSize: FONT_SIZE.xs, marginTop: 4 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  statCell: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statVal: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  statLbl: { fontSize: FONT_SIZE.xs, marginTop: 4 },
  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.md },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  actTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  actMeta: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  emptyFeed: { textAlign: 'center', paddingVertical: SPACING.xl },
  btnRow: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl, gap: SPACING.sm },
  btnPrimary: {
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  btnPrimaryText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  btnGhost: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    opacity: 0.55,
  },
  btnGhostText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});
