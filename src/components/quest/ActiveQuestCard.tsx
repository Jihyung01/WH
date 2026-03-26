import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { ActiveQuest } from '../../stores/questStore';
import { EventCategory } from '../../types/enums';
import { formatDistance, formatTimer } from '../../utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../config/theme';

interface ActiveQuestCardProps {
  quest: ActiveQuest;
  index?: number;
  onResume?: (quest: ActiveQuest) => void;
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  [EventCategory.ACTIVITY]: '🏃',
  [EventCategory.CAFE]: '☕',
  [EventCategory.CULTURE]: '🏛️',
  [EventCategory.FOOD]: '🍜',
  [EventCategory.NATURE]: '🌿',
  [EventCategory.NIGHTLIFE]: '🌙',
  [EventCategory.SHOPPING]: '🛍️',
  [EventCategory.HIDDEN_GEM]: '💎',
};

function ActiveQuestCard({ quest, index = 0, onResume }: ActiveQuestCardProps) {
  const { event, completedSteps, totalSteps, timeRemaining, nextStepDistance } = quest;
  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const emoji = CATEGORY_EMOJI[event.category] ?? '📍';

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onResume?.(quest);
        }}
      >
        {/* Left icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>

        {/* Main content */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressText}>{completedSteps}/{totalSteps}</Text>
          </View>

          {/* Steps visualization */}
          <View style={styles.stepsRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  i < completedSteps
                    ? styles.stepCompleted
                    : i === completedSteps
                      ? styles.stepCurrent
                      : styles.stepPending,
                ]}
              >
                {i < completedSteps && (
                  <Ionicons name="checkmark" size={10} color={COLORS.textPrimary} />
                )}
              </View>
            ))}
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {timeRemaining != null && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color={COLORS.warning} />
                <Text style={[styles.metaText, { color: COLORS.warning }]}>
                  {formatTimer(timeRemaining)}
                </Text>
              </View>
            )}
            {nextStepDistance != null && (
              <View style={styles.metaChip}>
                <Ionicons name="navigate-outline" size={12} color={COLORS.info} />
                <Text style={[styles.metaText, { color: COLORS.info }]}>
                  {formatDistance(nextStepDistance)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Resume button */}
        <Pressable
          style={styles.resumeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onResume?.(quest);
          }}
        >
          <Text style={styles.resumeText}>이어하기</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(ActiveQuestCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },

  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },

  body: { flex: 1, gap: 6 },
  title: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  progressText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, width: 28 },

  stepsRow: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepCompleted: { backgroundColor: COLORS.success },
  stepCurrent: { backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primaryLight },
  stepPending: { backgroundColor: COLORS.surfaceHighlight },

  metaRow: { flexDirection: 'row', gap: SPACING.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  resumeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  resumeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
});
