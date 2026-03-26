import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeIn,
  Easing,
} from 'react-native-reanimated';

import { useMapStore } from '../../src/stores/mapStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { eventService } from '../../src/services/eventService';
import { useNarrative } from '../../src/hooks/useNarrative';
import { getDistance } from '../../src/utils/geo';
import { formatDistance } from '../../src/utils/format';
import { CHECK_IN_RADIUS_METERS } from '../../src/utils/constants';
import { EventCategory, EventStatus } from '../../src/types/enums';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, BRAND, EVENT_COLORS } from '../../src/config/theme';
import { useTheme } from '../../src/providers/ThemeProvider';
import { GPSCheckIn, PhotoMission, QuizMission, TextMission, TimerMission } from '../../src/components/mission';
import type { Event, MissionObjective } from '../../src/types';

const CATEGORY_META: Record<string, { emoji: string; label: string; gradient: string[] }> = {
  [EventCategory.ACTIVITY]: { emoji: '🏃', label: '탐험', gradient: [EVENT_COLORS.exploration, '#059669'] },
  [EventCategory.CULTURE]:  { emoji: '📸', label: '문화', gradient: [EVENT_COLORS.photo, '#2563EB'] },
  [EventCategory.HIDDEN_GEM]: { emoji: '🧩', label: '숨은명소', gradient: [EVENT_COLORS.quiz, '#7C3AED'] },
  [EventCategory.FOOD]:     { emoji: '🍜', label: '맛집', gradient: [EVENT_COLORS.partnership, '#D97706'] },
  [EventCategory.CAFE]:     { emoji: '☕', label: '카페', gradient: ['#D97706', '#B45309'] },
  [EventCategory.NATURE]:   { emoji: '🌿', label: '자연', gradient: [EVENT_COLORS.exploration, '#047857'] },
  [EventCategory.NIGHTLIFE]: { emoji: '🌙', label: '야간', gradient: [BRAND.purple, '#7C3AED'] },
  [EventCategory.SHOPPING]: { emoji: '🛍️', label: '쇼핑', gradient: [BRAND.coral, '#DC2626'] },
};

interface MockMissionStep {
  id: string;
  type: 'GPS' | 'PHOTO' | 'QUIZ' | 'TEXT' | 'TIMER';
  description: string;
  isCompleted: boolean;
  config?: Record<string, any>;
}

function generateMockMissions(event: Event): MockMissionStep[] {
  return [
    { id: 's1', type: 'GPS', description: '목적지에 도착하세요', isCompleted: false },
    { id: 's2', type: 'PHOTO', description: '이 장소의 특별한 점을 사진으로 남기세요', isCompleted: false },
    { id: 's3', type: 'QUIZ', description: '퀴즈를 풀어보세요', isCompleted: false, config: {
      question: `"${event.title}"에 관한 퀴즈: 이 장소는 어떤 구역에 위치하고 있을까요?`,
      options: [
        { id: 'a', text: '홍대', isCorrect: true },
        { id: 'b', text: '강남', isCorrect: false },
        { id: 'c', text: '이태원', isCorrect: false },
        { id: 'd', text: '여의도', isCorrect: false },
      ],
    }},
    { id: 's4', type: 'TEXT', description: '이 장소에 대한 짧은 후기를 남겨주세요', isCompleted: false },
  ];
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const visibleEvents = useMapStore((s) => s.visibleEvents);
  const currentPosition = useLocationStore((s) => s.currentPosition);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionSteps, setMissionSteps] = useState<MockMissionStep[]>([]);
  const [missionStarted, setMissionStarted] = useState(false);

  const { displayedText, status: narrativeStatus, retry: retryNarrative } = useNarrative(
    event?.id,
    event?.category,
    event?.narrative,
  );

  // Shimmer animation for loading state
  const shimmerX = useSharedValue(0);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmerX.value * 0.4,
  }));

  // Try local cache first, then API
  useEffect(() => {
    const cached = visibleEvents.find((e) => e.id === id);
    if (cached) {
      setEvent(cached);
      setMissionSteps(generateMockMissions(cached));
      setLoading(false);
    } else {
      (async () => {
        try {
          const data = await eventService.getById(id!);
          setEvent(data);
          setMissionSteps(generateMockMissions(data));
        } catch {
          const fallback = visibleEvents[0];
          if (fallback) {
            setEvent({ ...fallback, id: id! });
            setMissionSteps(generateMockMissions(fallback));
          }
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const distance = useMemo(() => {
    if (!currentPosition || !event) return null;
    return getDistance(currentPosition, event.location);
  }, [currentPosition, event]);

  const isInRange = distance !== null && distance <= CHECK_IN_RADIUS_METERS;
  const walkMinutes = distance !== null ? Math.max(1, Math.round(distance / 80)) : null;

  const completedCount = missionSteps.filter((s) => s.isCompleted).length;
  const allCompleted = completedCount === missionSteps.length && missionSteps.length > 0;
  const activeStepIndex = missionSteps.findIndex((s) => !s.isCompleted);

  const handleStepComplete = useCallback((stepId: string) => {
    setMissionSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, isCompleted: true } : s)),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleStartMission = () => {
    if (!isInRange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setMissionStarted(true);
  };

  const handleCompleteEvent = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/mission/complete/${id}`);
  };

  if (loading || !event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const meta = CATEGORY_META[event.category] ?? CATEGORY_META[EventCategory.ACTIVITY];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[...meta.gradient, COLORS.background]}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          </LinearGradient>

          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* ── Info Card ── */}
        <View style={styles.infoSection}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: meta.gradient[0] + '22' }]}>
              <Text style={[styles.badgeText, { color: meta.gradient[0] }]}>{meta.label}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI 생성</Text>
            </View>
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{event.address}</Text>
            </View>
            {distance !== null && (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={16} color={COLORS.info} />
                <Text style={[styles.metaText, { color: COLORS.info }]}>
                  {formatDistance(distance)} · 도보 {walkMinutes}분
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>난이도</Text>
              <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name="star"
                    size={16}
                    color={i < event.difficulty ? COLORS.warning : COLORS.surfaceHighlight}
                  />
                ))}
              </View>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>보상</Text>
              <View style={styles.rewardChips}>
                <Text style={styles.rewardText}>⚡ {event.xpReward} XP</Text>
                <Text style={styles.rewardText}>🪙 {event.coinReward}</Text>
              </View>
            </View>
            {event.difficulty >= 4 && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>제한시간</Text>
                <Text style={styles.timeLimitText}>30분</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* ── Narrative (AI-generated via FastAPI → Claude) ── */}
        {narrativeStatus === 'loading' && (
          <Animated.View style={[styles.narrativeCard, styles.narrativeShimmer, shimmerStyle]}>
            <Ionicons name="sparkles" size={18} color={COLORS.primaryLight} style={{ marginBottom: SPACING.sm }} />
            <View style={styles.shimmerLine} />
            <View style={[styles.shimmerLine, { width: '80%' }]} />
            <View style={[styles.shimmerLine, { width: '60%' }]} />
            <Text style={styles.shimmerLabel}>이야기를 만들고 있어요...</Text>
          </Animated.View>
        )}

        {narrativeStatus === 'error' && (
          <Animated.View entering={FadeIn} style={[styles.narrativeCard, styles.narrativeError]}>
            <Ionicons name="cloud-offline-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.errorText}>서사를 불러오지 못했어요</Text>
            <Pressable style={styles.retryBtn} onPress={retryNarrative}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </Animated.View>
        )}

        {narrativeStatus === 'offline' && (
          <Animated.View entering={FadeIn} style={[styles.narrativeCard, styles.narrativeOffline]}>
            <Ionicons name="wifi-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.offlineText}>오프라인 모드 — 서사는 온라인에서 확인하세요</Text>
          </Animated.View>
        )}

        {(narrativeStatus === 'typing' || narrativeStatus === 'done') && (
          <Animated.View entering={FadeIn.delay(100)} style={styles.narrativeCard}>
            <Text style={styles.narrativeQuote}>"</Text>
            <Text style={styles.narrativeText}>
              {displayedText}
              {narrativeStatus === 'typing' && <Text style={styles.cursor}>|</Text>}
            </Text>
            <Text style={styles.narrativeQuoteEnd}>"</Text>
            <View style={styles.narrativeFooter}>
              <Ionicons name="sparkles" size={14} color={COLORS.primaryLight} />
              <Text style={styles.narrativeSource}>AI가 생성한 서사</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Mission Steps ── */}
        {missionStarted && (
          <Animated.View entering={FadeIn} style={styles.missionSection}>
            <View style={styles.missionHeader}>
              <Text style={styles.missionTitle}>미션 단계</Text>
              <Text style={styles.missionProgress}>{completedCount}/{missionSteps.length}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${missionSteps.length > 0 ? (completedCount / missionSteps.length) * 100 : 0}%` },
                ]}
              />
            </View>

            <View style={styles.stepsContainer}>
              {missionSteps.map((step, index) => {
                const isActive = index === activeStepIndex;
                const isStepCompleted = step.isCompleted;

                switch (step.type) {
                  case 'GPS':
                    return (
                      <GPSCheckIn
                        key={step.id}
                        targetLocation={event.location}
                        onComplete={() => handleStepComplete(step.id)}
                        isActive={isActive}
                      />
                    );
                  case 'PHOTO':
                    return (
                      <PhotoMission
                        key={step.id}
                        description={step.description}
                        onComplete={() => handleStepComplete(step.id)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  case 'QUIZ':
                    return (
                      <QuizMission
                        key={step.id}
                        question={step.config?.question ?? '퀴즈 질문'}
                        options={step.config?.options ?? []}
                        onComplete={() => handleStepComplete(step.id)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  case 'TEXT':
                    return (
                      <TextMission
                        key={step.id}
                        description={step.description}
                        onComplete={() => handleStepComplete(step.id)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  case 'TIMER':
                    return (
                      <TimerMission
                        key={step.id}
                        durationSeconds={step.config?.duration ?? 60}
                        description={step.description}
                        onComplete={() => handleStepComplete(step.id)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.footer}>
        {allCompleted ? (
          <Pressable style={styles.ctaBtn} onPress={handleCompleteEvent}>
            <Text style={styles.ctaBtnText}>🎉 미션 완료하기</Text>
          </Pressable>
        ) : missionStarted ? (
          <View style={styles.ctaProgress}>
            <View style={styles.ctaProgressBar}>
              <View style={[styles.ctaProgressFill, { width: `${(completedCount / missionSteps.length) * 100}%` }]} />
            </View>
            <Text style={styles.ctaProgressText}>
              {completedCount}/{missionSteps.length} 단계 완료
            </Text>
          </View>
        ) : (
          <Pressable
            style={[styles.ctaBtn, !isInRange && styles.ctaBtnDisabled]}
            onPress={handleStartMission}
            disabled={!isInRange}
          >
            <Text style={styles.ctaBtnText}>
              {isInRange
                ? '미션 시작하기'
                : distance !== null
                  ? `${formatDistance(distance)} 이내에서 시작할 수 있어요`
                  : '위치 확인 중...'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },

  // ── Hero ──
  hero: { height: 240 },
  heroGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80, marginTop: 20 },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,14,26,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Info ──
  infoSection: {
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.xl,
  },
  badges: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  badge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  metaRow: { gap: SPACING.sm, marginBottom: SPACING.lg },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.xl,
  },
  stat: { gap: 6 },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  stars: { flexDirection: 'row', gap: 2 },
  rewardChips: { flexDirection: 'row', gap: SPACING.sm },
  rewardText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  timeLimitText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },

  // ── Narrative ──
  narrativeCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryLight,
  },
  narrativeShimmer: {
    borderLeftColor: COLORS.surfaceHighlight,
  },
  shimmerLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceHighlight,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  shimmerLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  narrativeError: {
    alignItems: 'center',
    gap: SPACING.sm,
    borderLeftColor: COLORS.error + '40',
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceHighlight,
    marginTop: SPACING.xs,
  },
  retryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  narrativeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderLeftColor: COLORS.textMuted,
  },
  offlineText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    flex: 1,
  },
  narrativeQuote: {
    fontSize: 36,
    color: COLORS.primaryLight,
    lineHeight: 36,
    marginBottom: -8,
  },
  narrativeText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  cursor: {
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.bold,
  },
  narrativeQuoteEnd: {
    fontSize: 36,
    color: COLORS.primaryLight,
    lineHeight: 36,
    textAlign: 'right',
    marginTop: -4,
  },
  narrativeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  narrativeSource: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.medium,
  },

  // ── Mission Steps ──
  missionSection: {
    paddingHorizontal: SPACING.xl,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  missionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  missionProgress: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 2,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepsContainer: { gap: SPACING.md },

  // ── Footer CTA ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  ctaBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    shadowOpacity: 0,
  },
  ctaBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  ctaProgress: { gap: SPACING.sm },
  ctaProgressBar: {
    height: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ctaProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  ctaProgressText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
