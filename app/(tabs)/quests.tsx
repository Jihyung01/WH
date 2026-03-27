import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestStore } from '../../src/stores/questStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { EventCard } from '../../src/components/quest';
import { EventCardSkeleton } from '../../src/components/ui';
import { EventCategory } from '../../src/types/enums';
import type { Event } from '../../src/types';
import { formatTimer } from '../../src/utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type QuestTab = 'nearby' | 'active' | 'recommended' | 'seasonal';

const TAB_ITEMS: { key: QuestTab; label: string; icon: string }[] = [
  { key: 'nearby', label: '주변', icon: 'location' },
  { key: 'active', label: '진행중', icon: 'play-circle' },
  { key: 'recommended', label: '추천', icon: 'sparkles' },
  { key: 'seasonal', label: '시즌', icon: 'leaf' },
];

const CATEGORY_FILTERS: { key: EventCategory | null; label: string }[] = [
  { key: null, label: '전체' },
  { key: EventCategory.ACTIVITY, label: '탐험' },
  { key: EventCategory.CAFE, label: '카페' },
  { key: EventCategory.FOOD, label: '맛집' },
  { key: EventCategory.CULTURE, label: '문화' },
  { key: EventCategory.NATURE, label: '자연' },
  { key: EventCategory.HIDDEN_GEM, label: '숨은명소' },
];

const DISTANCE_OPTIONS = [
  { value: null, label: '전체' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 3000, label: '3km' },
  { value: 5000, label: '5km' },
];

const DIFFICULTY_OPTIONS = [
  { value: null, label: '전체' },
  { value: 1, label: '★' },
  { value: 2, label: '★★' },
  { value: 3, label: '★★★' },
  { value: 4, label: '★★★★' },
  { value: 5, label: '★★★★★' },
];

export default function QuestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<QuestTab>('nearby');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState(14400);

  const currentPosition = useLocationStore((s) => s.currentPosition);

  const {
    nearbyEvents, activeEvents, recommendedEvents, seasonalEvents,
    dailySummary,
    isLoadingNearby, isLoadingActive, isLoadingRecommended, isLoadingSeasonal,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    difficultyFilter, setDifficultyFilter,
    distanceFilter, setDistanceFilter,
    resetFilters, refreshAll,
    fetchNearby, fetchActive, fetchRecommended, fetchSeasonal,
  } = useQuestStore();

  const defaultCenter = useMemo(
    () => currentPosition ?? { latitude: 37.5665, longitude: 126.978 },
    [currentPosition],
  );

  useEffect(() => {
    refreshAll(defaultCenter);
  }, []);

  // Daily reward countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll(defaultCenter);
    setRefreshing(false);
  }, [defaultCenter]);

  const handleEventPress = useCallback((event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  }, []);

  // Filter events based on search/category/difficulty/distance
  const filterEvents = useCallback(
    (events: Event[]) => {
      let filtered = events;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (e) => e.title.toLowerCase().includes(q) || e.address.toLowerCase().includes(q),
        );
      }
      if (categoryFilter) {
        filtered = filtered.filter((e) => e.category === categoryFilter);
      }
      if (difficultyFilter) {
        filtered = filtered.filter((e) => e.difficulty === difficultyFilter);
      }
      return filtered;
    },
    [searchQuery, categoryFilter, difficultyFilter],
  );

  const filteredNearby = useMemo(() => filterEvents(nearbyEvents), [nearbyEvents, filterEvents]);
  const filteredRecommended = useMemo(() => filterEvents(recommendedEvents), [recommendedEvents, filterEvents]);
  const filteredSeasonal = useMemo(() => filterEvents(seasonalEvents), [seasonalEvents, filterEvents]);

  const isLoading =
    activeTab === 'nearby' ? isLoadingNearby :
    activeTab === 'active' ? isLoadingActive :
    activeTab === 'recommended' ? isLoadingRecommended :
    isLoadingSeasonal;

  const activeCount = activeEvents.length;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>탐험</Text>
        <Pressable
          style={styles.filterBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="이벤트, 장소 검색..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Category Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {CATEGORY_FILTERS.map((cf) => {
          const isActive = categoryFilter === cf.key;
          return (
            <Pressable
              key={cf.label}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategoryFilter(isActive ? null : cf.key);
              }}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {cf.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {tab.key === 'active' && activeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Daily Summary Card (only on nearby tab) ── */}
        {activeTab === 'nearby' && (
          <Animated.View entering={FadeIn}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyCard}
            >
              <View style={styles.dailyHeader}>
                <Text style={styles.dailyTitle}>오늘의 탐험</Text>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakText}>{dailySummary.loginStreak}일 연속!</Text>
                </View>
              </View>

              <View style={styles.dailyProgressRow}>
                <View style={styles.dailyProgressTrack}>
                  <View
                    style={[
                      styles.dailyProgressFill,
                      { width: `${(dailySummary.completedToday / dailySummary.dailyGoal) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.dailyProgressText}>
                  {dailySummary.completedToday}/{dailySummary.dailyGoal} 완료
                </Text>
              </View>

              <View style={styles.dailyFooter}>
                <Ionicons name="gift-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.dailyCountdown}>
                  일일 보상까지 {formatTimer(dailyCountdown)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Nearby Tab ── */}
        {activeTab === 'nearby' && (
          <View style={styles.eventList}>
            {isLoadingNearby && nearbyEvents.length === 0 ? (
              <EventCardSkeleton count={4} />
            ) : filteredNearby.length > 0 ? (
              filteredNearby.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userLocation={currentPosition}
                  index={i}
                  onPress={handleEventPress}
                />
              ))
            ) : (
              <EmptyState
                emoji="🗺️"
                title="주변에 이벤트가 없어요"
                subtitle="다른 지역을 탐험해보세요!"
              />
            )}
          </View>
        )}

        {/* ── Active Tab ── */}
        {activeTab === 'active' && (
          <View style={styles.eventList}>
            {isLoadingActive && activeEvents.length === 0 ? (
              <EventCardSkeleton count={3} />
            ) : activeEvents.length > 0 ? (
              activeEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  onPress={handleEventPress}
                />
              ))
            ) : (
              <EmptyState
                emoji="🏁"
                title="진행 중인 탐험이 없어요"
                subtitle="주변 탭에서 새로운 탐험을 시작하세요!"
              />
            )}
          </View>
        )}

        {/* ── Recommended Tab ── */}
        {activeTab === 'recommended' && (
          <View style={styles.eventList}>
            <Animated.View entering={FadeInDown} style={styles.aiNotice}>
              <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              <Text style={styles.aiNoticeText}>
                당신의 탐험 스타일을 분석해 추천해드려요
              </Text>
            </Animated.View>
            {isLoadingRecommended && recommendedEvents.length === 0 ? (
              <EventCardSkeleton count={3} />
            ) : filteredRecommended.length > 0 ? (
              filteredRecommended.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userLocation={currentPosition}
                  index={i}
                  onPress={handleEventPress}
                />
              ))
            ) : (
              <EmptyState
                emoji="🤖"
                title="추천 이벤트를 준비 중이에요"
                subtitle="탐험을 더 하면 정확도가 올라갑니다!"
              />
            )}
          </View>
        )}

        {/* ── Seasonal Tab ── */}
        {activeTab === 'seasonal' && (
          <View style={styles.eventList}>
            <Animated.View entering={FadeInDown} style={styles.seasonBanner}>
              <Text style={styles.seasonEmoji}>🌸</Text>
              <View>
                <Text style={styles.seasonTitle}>2026 봄 시즌</Text>
                <Text style={styles.seasonSubtitle}>기간 한정 특별 이벤트</Text>
              </View>
            </Animated.View>
            {isLoadingSeasonal && seasonalEvents.length === 0 ? (
              <EventCardSkeleton count={3} />
            ) : filteredSeasonal.length > 0 ? (
              filteredSeasonal.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userLocation={currentPosition}
                  index={i}
                  onPress={handleEventPress}
                />
              ))
            ) : (
              <EmptyState
                emoji="🍂"
                title="시즌 이벤트가 없어요"
                subtitle="다음 시즌을 기대해주세요!"
              />
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Filter Bottom Sheet Modal ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterHandle} />
            <Text style={styles.filterSheetTitle}>필터</Text>

            {/* Distance */}
            <Text style={styles.filterLabel}>거리</Text>
            <View style={styles.filterOptionRow}>
              {DISTANCE_OPTIONS.map((opt) => {
                const isActive = distanceFilter === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={[styles.filterOption, isActive && styles.filterOptionActive]}
                    onPress={() => setDistanceFilter(isActive ? null : opt.value)}
                  >
                    <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Difficulty */}
            <Text style={styles.filterLabel}>난이도</Text>
            <View style={styles.filterOptionRow}>
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isActive = difficultyFilter === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={[styles.filterOption, isActive && styles.filterOptionActive]}
                    onPress={() => setDifficultyFilter(isActive ? null : opt.value)}
                  >
                    <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.filterActions}>
              <Pressable
                style={styles.filterResetBtn}
                onPress={() => {
                  resetFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.filterResetText}>초기화</Text>
              </Pressable>
              <Pressable
                style={styles.filterApplyBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.filterApplyText}>적용</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ── Empty State Helper ── */
function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <Animated.View entering={FadeInUp} style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Search ──
  searchRow: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
  },
  searchInput: {
    flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  // ── Category Chips ──
  chipsScroll: { maxHeight: 38, marginBottom: SPACING.sm },
  chipsContent: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.textPrimary },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  tabActive: { backgroundColor: COLORS.surfaceHighlight, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.textPrimary },
  badge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  // ── Scroll content ──
  scrollContent: { flex: 1, paddingHorizontal: SPACING.xl },

  // ── Daily Card ──
  dailyCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  dailyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  streakEmoji: { fontSize: 13 },
  streakText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  dailyProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  dailyProgressTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  dailyProgressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.textPrimary },
  dailyProgressText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  dailyFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyCountdown: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.7)' },

  // ── Event list ──
  eventList: { gap: SPACING.md },

  // ── AI Notice ──
  aiNotice: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  aiNoticeText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight, flex: 1 },

  // ── Season Banner ──
  seasonBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: '#FFB7C520',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#FFB7C540',
  },
  seasonEmoji: { fontSize: 36 },
  seasonTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  seasonSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // ── Empty State ──
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },

  // ── Filter Modal ──
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  filterHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.surfaceHighlight,
    alignSelf: 'center', marginBottom: SPACING.xl,
  },
  filterSheetTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.xl,
  },
  filterLabel: {
    fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },
  filterOptionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  filterOption: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
  },
  filterOptionActive: { backgroundColor: COLORS.primary },
  filterOptionText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.textMuted },
  filterOptionTextActive: { color: COLORS.textPrimary },
  filterActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  filterResetBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  filterResetText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  filterApplyBtn: {
    flex: 2, alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  filterApplyText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
});
