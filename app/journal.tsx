import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  FadeOut,
  Layout,
} from 'react-native-reanimated';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
} from '../src/stores/characterStore';
import {
  getJournals,
  getJournalByDate,
  generateJournal,
} from '../src/lib/api';
import type { JournalEntry } from '../src/lib/api';
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

function getHeatLevel(eventsCount: number): number {
  if (eventsCount === 0) return 0;
  if (eventsCount <= 1) return 1;
  if (eventsCount <= 3) return 2;
  return 3;
}

const HEAT_OPACITY = [0, 0.3, 0.6, 1.0];

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
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

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { character } = useCharacterStore();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [allJournals, setAllJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const characterType = character?.character_type ?? 'pathfinder';
  const characterLevel = character?.level ?? 1;
  const stage = getEvolutionStage(characterLevel);
  const emoji = getEvolutionEmoji(characterType, stage);
  const characterName = character?.name ?? '도담';

  const journalDateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of allJournals) {
      map.set(j.journal_date, (j.events_completed ?? []).length);
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

  async function handleGenerate() {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateJournal(selectedDate);
      await loadDayJournal(selectedDate);
      await loadAllJournals();
    } catch {
      // silent
    } finally {
      setIsGenerating(false);
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

  const shareData: ShareJournalData | null = selectedJournal
    ? {
        date: selectedJournal.journal_date,
        characterName,
        characterType,
        characterLevel,
        journalText: selectedJournal.journal_text,
        placesVisited: selectedJournal.share_card?.places_visited ?? [],
        xpEarned: selectedJournal.share_card?.xp_earned ?? 0,
        badgesEarned: (selectedJournal.share_card?.badges_earned ?? []).map(
          (name) => ({ name, rarity: 'common' }),
        ),
      }
    : null;

  const isToday = isSameDay(selectedDate, todayStr);
  const isFuture = selectedDate > todayStr;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
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
            const eventsCount = journalDateMap.get(dateStr) ?? 0;
            const hasJournal = journalDateMap.has(dateStr);
            const heatLevel = hasJournal ? getHeatLevel(eventsCount) : 0;
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

          {isLoadingDay ? (
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
              {/* Character Speech Bubble */}
              <View style={styles.speechContainer}>
                <View style={styles.speechHeader}>
                  <View style={styles.speechAvatar}>
                    <Text style={styles.speechAvatarEmoji}>{emoji}</Text>
                  </View>
                  <Text style={styles.speechName}>{characterName}</Text>
                </View>
                <View style={styles.speechBubble}>
                  <View style={styles.speechArrow} />
                  <Text style={styles.speechText}>{selectedJournal.journal_text}</Text>
                </View>
              </View>

              {/* Place Chips */}
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

              {/* Stats Row */}
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
              {isToday && !isFuture && (
                <Pressable
                  style={styles.generateButton}
                  onPress={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#FFF" />
                      <Text style={styles.generateButtonText}>
                        오늘의 탐험 일지 만들기
                      </Text>
                    </>
                  )}
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
const CELL_SIZE = (/* rough */ 0); // computed in styles via flex

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

  scrollView: {
    flex: 1,
  },
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
  selectedSection: {
    marginTop: SPACING.sm,
  },
  selectedDateLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },

  // Speech Bubble
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${BRAND.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechAvatarEmoji: {
    fontSize: 16,
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
  placesSection: {
    marginBottom: SPACING.lg,
  },
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
  placeChipsScroll: {
    gap: SPACING.sm,
  },
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

  // Stats Row
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
  skeletonContainer: {
    paddingVertical: SPACING.md,
  },
  skeletonBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
});
