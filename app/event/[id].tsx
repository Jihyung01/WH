import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fireImpactHeavy, fireNotificationSuccess } from '../../src/utils/hapticsSafe';
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
import {
  getEvent,
  getEventMissions,
  completeMission,
  grantQuizCoins,
  uploadMissionPhoto,
  submitContentReport,
  createCommunitySubmissionMissionPhoto,
} from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { useModerationStore } from '../../src/stores/moderationStore';
import { useNarrative } from '../../src/hooks/useNarrative';
import { getDistance } from '../../src/utils/geo';
import { formatDistance } from '../../src/utils/format';
import { CHECK_IN_RADIUS_METERS } from '../../src/utils/constants';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, BRAND, EVENT_COLORS } from '../../src/config/theme';
import { useTheme } from '../../src/providers/ThemeProvider';
import { GPSCheckIn, PhotoMission, QuizMission, TextMission, TimerMission } from '../../src/components/mission';
import type { Event, NearbyEvent, MissionWithStatus } from '../../src/types';

const CATEGORY_META: Record<string, { emoji: string; label: string; gradient: string[] }> = {
  exploration: { emoji: '🏃', label: '탐험', gradient: [EVENT_COLORS.exploration, '#059669'] },
  photo:       { emoji: '📸', label: '포토', gradient: [EVENT_COLORS.photo, '#2563EB'] },
  quiz:        { emoji: '🧩', label: '퀴즈', gradient: [EVENT_COLORS.quiz, '#7C3AED'] },
  partnership: { emoji: '🤝', label: '제휴', gradient: [EVENT_COLORS.partnership, '#D97706'] },
};

function isNearbyEvent(e: Event | NearbyEvent): e is NearbyEvent {
  return 'lat' in e && 'lng' in e;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const visibleEvents = useMapStore((s) => s.visibleEvents);
  const currentPosition = useLocationStore((s) => s.currentPosition);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const blockAndRefresh = useModerationStore((s) => s.blockAndRefresh);

  const [event, setEvent] = useState<Event | NearbyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<MissionWithStatus[]>([]);
  const [missionStarted, setMissionStarted] = useState(false);

  const { displayedText, status: narrativeStatus, retry: retryNarrative } = useNarrative(
    event?.id,
    event?.category,
    event?.narrative,
  );

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

  useEffect(() => {
    (async () => {
      const list = Array.isArray(visibleEvents) ? visibleEvents : [];
      try {
        const cached = list.find((e) => e.id === id);
        if (cached) {
          setEvent(cached);
        } else {
          const eventData = await getEvent(id!);
          setEvent(eventData);
        }
        const missionsData = await getEventMissions(id!);
        setMissions(missionsData);
      } catch (err) {
        console.error('Failed to load event:', err);
        const fallback = list.find((e) => e.id === id) ?? list[0];
        if (fallback) setEvent(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 이미 DB에 모든 미션이 완료된 상태로 들어오면 `allCompleted`만 true이고 `missionStarted`는 false라
  // 미션 단계 블록이 렌더되지 않음 → 단계가 "삭제된 것처럼" 보임. 완료된 단계도 목록은 보이게 연다.
  useEffect(() => {
    if (missions.length === 0) return;
    const everyDone = missions.every((m) => m.is_completed);
    if (everyDone) setMissionStarted(true);
  }, [missions]);

  const distance = useMemo(() => {
    if (!currentPosition || !event) return null;
    if (isNearbyEvent(event)) {
      return getDistance(currentPosition, { latitude: event.lat, longitude: event.lng });
    }
    return null;
  }, [currentPosition, event]);

  const isInRange = distance !== null && distance <= CHECK_IN_RADIUS_METERS;
  const walkMinutes = distance !== null ? Math.max(1, Math.round(distance / 80)) : null;

  const completedCount = missions.filter((m) => m.is_completed).length;
  const allCompleted = completedCount === missions.length && missions.length > 0;
  const activeStepIndex = missions.findIndex((m) => !m.is_completed);

  const handleStepComplete = useCallback(
    async (
      mission: MissionWithStatus,
      options?: { proofLocalUri?: string; answer?: string },
    ) => {
      try {
        let proofUrl: string | undefined;
        if (mission.mission_type === 'photo' && options?.proofLocalUri) {
          proofUrl = await uploadMissionPhoto(mission.id, options.proofLocalUri);
        }
        const answer = mission.mission_type === 'text' ? options?.answer : undefined;
        const completion = await completeMission(mission.id, id!, answer, proofUrl);

        if (mission.mission_type === 'photo' && proofUrl) {
          try {
            await createCommunitySubmissionMissionPhoto(completion.id, proofUrl, 'public');
          } catch (feedErr) {
            console.warn('Community feed submission skipped:', feedErr);
          }
        }

        setMissions((prev) =>
          prev.map((m) => (m.id === mission.id ? { ...m, is_completed: true } : m)),
        );
        fireNotificationSuccess();

        if (mission.mission_type === 'quiz') {
          grantQuizCoins().catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to record mission completion:', err);
        Alert.alert('오류', '미션 완료 처리에 실패했습니다. 네트워크와 저장소 권한을 확인해 주세요.');
      }
    },
    [id],
  );

  const showUgcSafety =
    !!currentUserId &&
    !!event &&
    event.creator_type === 'user' &&
    !!event.creator_id &&
    event.creator_id !== currentUserId;

  const openUgcSafetyMenu = useCallback(() => {
    if (!event || !showUgcSafety || !event.creator_id) return;
    Alert.alert('콘텐츠 안전', '이 사용자가 제안한 이벤트입니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '부적절한 콘텐츠 신고',
        onPress: () => {
          Alert.alert('신고 사유', '해당되는 항목을 선택해 주세요.', [
            {
              text: '스팸·광고',
              onPress: async () => {
                try {
                  await submitContentReport({
                    contentType: 'event',
                    contentId: event.id,
                    reportedUserId: event.creator_id!,
                    reason: '스팸·광고',
                  });
                  Alert.alert('접수됨', '신고가 접수되었습니다. 운영팀이 검토합니다.');
                } catch (e: any) {
                  Alert.alert('오류', e?.message ?? '신고에 실패했습니다.');
                }
              },
            },
            {
              text: '혐오·욕설·위험',
              onPress: async () => {
                try {
                  await submitContentReport({
                    contentType: 'event',
                    contentId: event.id,
                    reportedUserId: event.creator_id!,
                    reason: '혐오·욕설·위험',
                  });
                  Alert.alert('접수됨', '신고가 접수되었습니다. 운영팀이 검토합니다.');
                } catch (e: any) {
                  Alert.alert('오류', e?.message ?? '신고에 실패했습니다.');
                }
              },
            },
            { text: '취소', style: 'cancel' },
          ]);
        },
      },
      {
        text: '작성자 차단',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            '작성자 차단',
            '이 작성자의 사용자 제작 이벤트가 내 지도 목록에서 즉시 숨겨집니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '차단',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await blockAndRefresh(event.creator_id!);
                    Alert.alert('완료', '차단되었습니다.');
                    router.back();
                  } catch (e: any) {
                    Alert.alert('오류', e?.message ?? '차단에 실패했습니다.');
                  }
                },
              },
            ],
          );
        },
      },
    ]);
  }, [showUgcSafety, event, blockAndRefresh, router]);

  const handleStartMission = () => {
    if (!isInRange) return;
    fireImpactHeavy();
    setMissionStarted(true);
  };

  const handleCompleteEvent = () => {
    fireNotificationSuccess();
    router.push(`/reward/${id}`);
  };

  if (loading || !event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.exploration;

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
          {showUgcSafety ? (
            <Pressable style={styles.flagBtn} onPress={openUgcSafetyMenu} accessibilityLabel="신고 및 차단">
              <Ionicons name="flag-outline" size={22} color={COLORS.textPrimary} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Info Card ── */}
        <View style={styles.infoSection}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: meta.gradient[0] + '22' }]}>
              <Text style={[styles.badgeText, { color: meta.gradient[0] }]}>{meta.label}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {event.creator_type === 'user' ? '사용자 제작' : 'AI 생성'}
              </Text>
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
                <Text style={styles.rewardText}>⚡ {event.reward_xp} XP</Text>
              </View>
            </View>
            {event.time_limit_minutes && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>제한시간</Text>
                <Text style={styles.timeLimitText}>{event.time_limit_minutes}분</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* ── Narrative (AI-generated via Edge Function → Claude) ── */}
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
              <Text style={styles.missionProgress}>{completedCount}/{missions.length}</Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${missions.length > 0 ? (completedCount / missions.length) * 100 : 0}%` },
                ]}
              />
            </View>

            <View style={styles.stepsContainer}>
              {missions.map((mission, index) => {
                const isActive = index === activeStepIndex;
                const isStepCompleted = mission.is_completed;

                switch (mission.mission_type) {
                  case 'gps_checkin':
                    return (
                      <GPSCheckIn
                        key={mission.id}
                        targetLocation={
                          event && isNearbyEvent(event)
                            ? { latitude: event.lat, longitude: event.lng }
                            : { latitude: 0, longitude: 0 }
                        }
                        onComplete={() => handleStepComplete(mission)}
                        isActive={isActive}
                      />
                    );
                  case 'photo':
                    return (
                      <PhotoMission
                        key={mission.id}
                        description={mission.description ?? mission.title}
                        onComplete={(uri) => handleStepComplete(mission, { proofLocalUri: uri })}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  case 'quiz': {
                    const cfg = mission.config as {
                      question?: string;
                      options?: string[];
                      correctIndex?: number;
                      correct_index?: number;
                    };
                    const correctIndex = cfg.correctIndex ?? cfg.correct_index ?? 0;
                    const quizOptions = (cfg.options ?? []).map((text, i) => ({
                      id: String(i),
                      text,
                      isCorrect: i === correctIndex,
                    }));
                    return (
                      <QuizMission
                        key={mission.id}
                        question={cfg.question ?? mission.title}
                        options={quizOptions}
                        onComplete={() => handleStepComplete(mission)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  }
                  case 'text':
                    return (
                      <TextMission
                        key={mission.id}
                        description={mission.description ?? mission.title}
                        onComplete={(text) => handleStepComplete(mission, { answer: text })}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  case 'timer': {
                    const timerConfig = mission.config as {
                      duration?: number;
                      duration_seconds?: number;
                    };
                    return (
                      <TimerMission
                        key={mission.id}
                        durationSeconds={timerConfig.duration ?? timerConfig.duration_seconds ?? 60}
                        description={mission.description ?? mission.title}
                        onComplete={() => handleStepComplete(mission)}
                        isActive={isActive}
                        isCompleted={isStepCompleted}
                      />
                    );
                  }
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
              <View style={[styles.ctaProgressFill, { width: `${(completedCount / missions.length) * 100}%` }]} />
            </View>
            <Text style={styles.ctaProgressText}>
              {completedCount}/{missions.length} 단계 완료
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
  flagBtn: {
    position: 'absolute',
    top: 56,
    right: SPACING.lg,
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
