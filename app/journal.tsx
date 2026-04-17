import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';

import { useCharacterStore } from '../src/stores/characterStore';
import { CharacterAvatar } from '../src/components/character/CharacterAvatar';
import {
  getJournals,
  getJournalByDate,
  generateJournal,
} from '../src/lib/api';
import type {
  JournalEntry,
  JournalTimelineData,
  JournalTimelineItem,
} from '../src/lib/api';
import ShareJournalCard from '../src/components/share/ShareJournalCard';
import type { ShareJournalData } from '../src/components/share/ShareJournalCard';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOWS,
  BRAND,
} from '../src/config/theme';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string, b: string) {
  return a === b;
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function getHeatLevel(activityCount: number): number {
  if (activityCount === 0) return 0;
  if (activityCount <= 1) return 1;
  if (activityCount <= 3) return 2;
  return 3;
}

const HEAT_OPACITY = [0, 0.3, 0.6, 1.0];

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius: BORDER_RADIUS.sm,
          backgroundColor: COLORS.surfaceLight,
        },
        style,
      ]}
    />
  );
}

// ─── Timeline view ──────────────────────────────────────────────────────────

function TimelineRow({
  item,
  isFirst,
  isLast,
}: {
  item: JournalTimelineItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlRail}>
        <View style={[styles.tlLine, isFirst && styles.tlLineTopHidden]} />
        <View style={styles.tlDot}>
          <Text style={styles.tlDotEmoji}>{item.emoji || '•'}</Text>
        </View>
        <View style={[styles.tlLine, isLast && styles.tlLineBottomHidden]} />
      </View>
      <View style={styles.tlCard}>
        <View style={styles.tlCardHeader}>
          <Text style={styles.tlTime}>{item.time}</Text>
          {item.has_music && item.music_title ? (
            <View style={styles.tlMusic}>
              <Ionicons name="musical-note" size={12} color={BRAND.primary} />
              <Text style={styles.tlMusicText} numberOfLines={1}>
                {item.music_title}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.tlSummary}>{item.summary}</Text>
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={styles.tlPhoto}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </View>
  );
}

function TimelineView({
  data,
  characterName,
}: {
  data: JournalTimelineData;
  characterName: string;
}) {
  const items = Array.isArray(data.timeline) ? data.timeline : [];
  return (
    <Animated.View entering={FadeInUp.duration(300)}>
      <View style={styles.tlIntroCard}>
        <Text style={styles.tlIntroLabel}>{characterName}의 하루</Text>
        <Text style={styles.tlIntroText}>{data.intro}</Text>
      </View>

      <View style={styles.tlList}>
        {items.map((it, i) => (
          <TimelineRow
            key={it.mark_id ?? `tl-${i}`}
            item={it}
            isFirst={i === 0}
            isLast={i === items.length - 1}
          />
        ))}
      </View>

      <View style={styles.tlOutroCard}>
        <Ionicons name="sparkles" size={14} color={BRAND.primary} />
        <Text style={styles.tlOutroText}>{data.outro}</Text>
      </View>

      <View style={styles.tlSummaryRow}>
        <View style={styles.tlSummaryItem}>
          <Text style={styles.tlSummaryValue}>{data.total_marks}</Text>
          <Text style={styles.tlSummaryLabel}>흔적</Text>
        </View>
        <View style={styles.tlSummaryDivider} />
        <View style={styles.tlSummaryItem}>
          <Text style={styles.tlSummaryValue}>{data.total_checkins}</Text>
          <Text style={styles.tlSummaryLabel}>체크인</Text>
        </View>
        <View style={styles.tlSummaryDivider} />
        <View style={styles.tlSummaryItem}>
          <Text style={styles.tlSummaryValue}>
            {(data.districts_visited ?? []).length}
          </Text>
          <Text style={styles.tlSummaryLabel}>구</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { character } = useCharacterStore();
  const params = useLocalSearchParams<{ auto?: string; date?: string }>();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const initialSelected =
    typeof params.date === 'string' && params.date.length === 10
      ? params.date
      : todayStr;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialSelected);

  const [allJournals, setAllJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const autoTriggerRef = useRef(false);

  const characterType = character?.character_type ?? 'explorer';
  const characterLevel = character?.level ?? 1;
  const characterName = character?.name ?? '도담';

  const journalDateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of allJournals) {
      const eventsCount = (j.events_completed ?? []).length;
      const marksCount = (j.mark_ids ?? []).length;
      map.set(j.journal_date, Math.max(eventsCount, marksCount));
    }
    return map;
  }, [allJournals]);

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  useEffect(() => {
    loadAllJournals();
  }, []);

  useEffect(() => {
    if (selectedDate) loadDayJournal(selectedDate);
  }, [selectedDate]);

  const handleGenerate = useCallback(
    async (options?: { autoGenerated?: boolean }) => {
      try {
        setIsGenerating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await generateJournal(selectedDate, {
          autoGenerated: options?.autoGenerated === true,
        });
        await loadDayJournal(selectedDate);
        await loadAllJournals();
      } catch {
        // silent — UI는 빈 상태로 돌아감
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedDate],
  );

  // ── 자동 생성 트리거: ?auto=1 (오늘 날짜 + 일지 없음) ─────────────
  useEffect(() => {
    if (autoTriggerRef.current) return;
    if (params.auto !== '1') return;
    if (selectedDate !== todayStr) return;
    if (isLoadingDay || isGenerating) return;
    if (selectedJournal) return;
    autoTriggerRef.current = true;
    void handleGenerate({ autoGenerated: true });
  }, [
    params.auto,
    selectedDate,
    todayStr,
    isLoadingDay,
    isGenerating,
    selectedJournal,
    handleGenerate,
  ]);

  async function loadAllJournals() {
    try {
      setIsLoadingAll(true);
      const journals = await getJournals();
      setAllJournals(journals);
    } catch {
      // silent
    } finally {
      setIsLoadingAll(false);
    }
  }

  async function loadDayJournal(date: string) {
    try {
      setIsLoadingDay(true);
      setSelectedJournal(null);
      const journal = await getJournalByDate(date);
      setSelectedJournal(journal);
    } catch {
      setSelectedJournal(null);
    } finally {
      setIsLoadingDay(false);
    }
  }

  function navigateMonth(delta: number) {
    Haptics.selectionAsync();
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setViewYear(newYear);
    setViewMonth(newMonth);
  }

  function handleDayTap(day: number) {
    Haptics.selectionAsync();
    const date = new Date(viewYear, viewMonth, day);
    setSelectedDate(toDateStr(date));
  }

  // ── 공유 데이터 ───────────────────────────────────────────────────
  const shareData: ShareJournalData | null = selectedJournal
    ? (() => {
        const tl = selectedJournal.timeline_data ?? null;
        const journalText =
          selectedJournal.format === 'timeline' && tl
            ? [
                tl.intro,
                ...(tl.timeline ?? []).map(
                  (it) =>
                    `${it.time} ${it.emoji} ${it.summary}${
                      it.has_music && it.music_title
                        ? ` ♪ ${it.music_title}`
                        : ''
                    }`,
                ),
                tl.outro,
              ]
                .filter(Boolean)
                .join('\n')
            : selectedJournal.journal_text;

        return {
          date: selectedJournal.journal_date,
          characterName,
          characterType,
          characterLevel,
          journalText,
          placesVisited: selectedJournal.share_card?.places_visited ?? [],
          xpEarned: selectedJournal.share_card?.xp_earned ?? 0,
          badgesEarned: (selectedJournal.share_card?.badges_earned ?? []).map(
            (name) => ({ name, rarity: 'common' }),
          ),
        };
      })()
    : null;

  const isToday = isSameDay(selectedDate, todayStr);
  const isFuture = selectedDate > todayStr;
  const isTimelineJournal =
    !!selectedJournal &&
    selectedJournal.format === 'timeline' &&
    !!selectedJournal.timeline_data;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>탐험 일지</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.monthNav}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {viewYear}년 {MONTH_NAMES[viewMonth]}
          </Text>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Day Labels */}
        <View style={styles.dayLabelsRow}>
          {DAY_LABELS.map((label) => (
            <View key={label} style={styles.dayLabelCell}>
              <Text style={styles.dayLabelText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap Grid */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heatmapGrid}>
          {monthCells.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.heatCell} />;
            }

            const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
            const activityCount = journalDateMap.get(dateStr) ?? 0;
            const hasJournal = journalDateMap.has(dateStr);
            const heatLevel = hasJournal ? getHeatLevel(activityCount) : 0;
            const isSelected = isSameDay(dateStr, selectedDate);
            const isTodayCell = isSameDay(dateStr, todayStr);

            return (
              <Pressable
                key={`day-${day}`}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor:
                      heatLevel > 0
                        ? `rgba(45, 212, 168, ${HEAT_OPACITY[heatLevel]})`
                        : COLORS.surface,
                  },
                  isSelected && styles.heatCellSelected,
                ]}
                onPress={() => handleDayTap(day)}
              >
                <Text
                  style={[
                    styles.heatCellText,
                    heatLevel >= 3 && { color: '#0F172A' },
                    isSelected && styles.heatCellTextSelected,
                  ]}
                >
                  {day}
                </Text>
                {isTodayCell && <View style={styles.todayDot} />}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Selected Day Content */}
        <View style={styles.selectedSection}>
          <Text style={styles.selectedDateLabel}>
            {selectedDate.replace(/-/g, '. ')}
          </Text>

          {isGenerating ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.generatingBox}>
              <ActivityIndicator size="small" color={BRAND.primary} />
              <Text style={styles.generatingText}>AI가 오늘을 정리하고 있어요...</Text>
            </Animated.View>
          ) : isLoadingDay ? (
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonBubble}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md }}>
                  <SkeletonBlock width={32} height={32} style={{ borderRadius: 16 }} />
                  <SkeletonBlock width={60} height={16} />
                </View>
                <SkeletonBlock width="100%" height={14} style={{ marginBottom: SPACING.sm }} />
                <SkeletonBlock width="80%" height={14} style={{ marginBottom: SPACING.sm }} />
                <SkeletonBlock width="60%" height={14} />
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
                <SkeletonBlock width={80} height={28} style={{ borderRadius: 14 }} />
                <SkeletonBlock width={80} height={28} style={{ borderRadius: 14 }} />
                <SkeletonBlock width={80} height={28} style={{ borderRadius: 14 }} />
              </View>
            </View>
          ) : selectedJournal ? (
            <Animated.View entering={FadeInUp.duration(300)} key={selectedJournal.id}>
              {isTimelineJournal ? (
                <TimelineView
                  data={selectedJournal.timeline_data as JournalTimelineData}
                  characterName={characterName}
                />
              ) : (
                <>
                  {/* Character Speech Bubble (narrative) */}
                  <View style={styles.speechContainer}>
                    <View style={styles.speechHeader}>
                      <View style={styles.speechAvatar}>
                        <CharacterAvatar
                          characterType={characterType}
                          level={characterLevel}
                          size={28}
                          showLoadoutOverlay={false}
                          interactive={false}
                          favoriteDistrict={character?.favorite_district ?? null}
                          borderColor={BRAND.primary}
                          backgroundColor={`${BRAND.primary}20`}
                        />
                      </View>
                      <Text style={styles.speechName}>{characterName}</Text>
                    </View>
                    <View style={styles.speechBubble}>
                      <View style={styles.speechArrow} />
                      <Text style={styles.speechText}>{selectedJournal.journal_text}</Text>
                    </View>
                  </View>

                  {(selectedJournal.share_card?.places_visited ?? []).length > 0 && (
                    <View style={styles.placesSection}>
                      <View style={styles.placesSectionHeader}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.placesSectionTitle}>방문한 장소</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.placeChipsScroll}
                      >
                        {selectedJournal.share_card.places_visited.map((place, i) => (
                          <View key={i} style={styles.placeChip}>
                            <Ionicons name="pin" size={12} color={BRAND.primary} />
                            <Text style={styles.placeChipText}>{place}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="flash" size={18} color="#FBBF24" />
                      <Text style={styles.statValue}>
                        +{selectedJournal.share_card?.xp_earned ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>XP</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Ionicons name="ribbon" size={18} color="#F472B6" />
                      <Text style={styles.statValue}>
                        {(selectedJournal.share_card?.badges_earned ?? []).length}
                      </Text>
                      <Text style={styles.statLabel}>배지</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Ionicons name="footsteps-outline" size={18} color={BRAND.primary} />
                      <Text style={styles.statValue}>
                        {(selectedJournal.share_card?.places_visited ?? []).length}
                      </Text>
                      <Text style={styles.statLabel}>장소</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Share Button */}
              <Pressable
                style={styles.shareButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowShare(true);
                }}
              >
                <Ionicons name="share-outline" size={18} color="#FFF" />
                <Text style={styles.shareButtonText}>공유하기</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="book-outline" size={36} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>
                {isFuture
                  ? '아직 오지 않은 날이에요'
                  : '이 날은 탐험 기록이 없어요'}
              </Text>
              {!isFuture && (
                <Pressable
                  style={styles.generateButton}
                  onPress={() => void handleGenerate()}
                  disabled={isGenerating}
                >
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                  <Text style={styles.generateButtonText}>
                    {isToday ? '오늘의 탐험 일지 만들기' : '이 날의 일지 만들기'}
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShare}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShare(false)}
      >
        {shareData && (
          <ShareJournalCard data={shareData} onClose={() => setShowShare(false)} />
        )}
      </Modal>
    </View>
  );
}

const CELL_GAP = 4;
const GRID_PADDING = SPACING.lg;

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
    width: 36,
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: SPACING.lg,
  },

  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.xl,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    minWidth: 100,
    textAlign: 'center',
  },

  // Day Labels
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  dayLabelText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Heatmap Grid
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    marginBottom: SPACING.xl,
  },
  heatCell: {
    width: `${100 / 7 - 1}%` as any,
    flexBasis: '13%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  heatCellSelected: {
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  heatCellText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  heatCellTextSelected: {
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.primary,
    position: 'absolute',
    bottom: 4,
  },

  // Selected Section
  selectedSection: { marginTop: SPACING.sm },
  selectedDateLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },

  // Generating banner
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  generatingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Timeline
  tlIntroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  tlIntroLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 4,
  },
  tlIntroText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.5,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tlList: {
    marginBottom: SPACING.md,
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  tlRail: {
    width: 28,
    alignItems: 'center',
  },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
    minHeight: 8,
  },
  tlLineTopHidden: { backgroundColor: 'transparent' },
  tlLineBottomHidden: { backgroundColor: 'transparent' },
  tlDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${BRAND.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotEmoji: {
    fontSize: 14,
  },
  tlCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: 4,
    ...SHADOWS.sm,
  },
  tlCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tlTime: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.primary,
  },
  tlMusic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
  },
  tlMusicText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
    flexShrink: 1,
  },
  tlSummary: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  tlPhoto: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  tlOutroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${BRAND.primary}10`,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  tlOutroText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  tlSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  tlSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  tlSummaryValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  tlSummaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tlSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  // Speech Bubble (narrative)
  speechContainer: {
    marginBottom: SPACING.lg,
  },
  speechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  speechAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  speechName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  speechBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderTopLeftRadius: BORDER_RADIUS.sm / 2,
    padding: SPACING.lg,
    marginLeft: 40,
    position: 'relative',
    ...SHADOWS.sm,
  },
  speechArrow: {
    position: 'absolute',
    top: -6,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.surface,
  },
  speechText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.6,
  },

  // Places
  placesSection: { marginBottom: SPACING.lg },
  placesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  placesSectionTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
  placeChipsScroll: { gap: SPACING.sm },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeChipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Stats Row (narrative)
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },

  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.glow,
  },
  shareButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
    ...SHADOWS.glow,
  },
  generateButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Skeleton
  skeletonContainer: { paddingVertical: SPACING.md },
  skeletonBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
});
