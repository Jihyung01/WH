import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizMissionProps {
  question: string;
  options: QuizOption[];
  onComplete: () => void;
  isActive: boolean;
  isCompleted: boolean;
}

export function QuizMission({ question, options, onComplete, isActive, isCompleted }: QuizMissionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleSelect = (option: QuizOption) => {
    if (!isActive || answered) return;

    setSelectedId(option.id);
    setAnswered(true);

    if (option.isCorrect) {
      setIsCorrect(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } else {
      setIsCorrect(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      setTimeout(() => {
        setSelectedId(null);
        setAnswered(false);
      }, 1200);
    }
  };

  const getOptionStyle = (option: QuizOption) => {
    if (!answered || selectedId !== option.id) {
      if (answered && option.isCorrect && !isCorrect) {
        return styles.optionCorrectReveal;
      }
      return styles.option;
    }
    return option.isCorrect ? styles.optionCorrect : styles.optionWrong;
  };

  const iconColor = isCompleted ? COLORS.success : isActive ? COLORS.primary : COLORS.textMuted;

  return (
    <View style={[styles.container, !isActive && !isCompleted && styles.containerDisabled]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, isCompleted && styles.iconCircleSuccess]}>
          <Ionicons
            name={isCompleted ? 'checkmark' : 'help-circle'}
            size={24}
            color={iconColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.label}>퀴즈</Text>
          {!isActive && !isCompleted && (
            <Text style={styles.sublabel}>이전 단계를 완료해주세요</Text>
          )}
        </View>
      </View>

      {(isActive || isCompleted) && (
        <Animated.View style={shakeStyle}>
          <Text style={styles.question}>{question}</Text>
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                style={getOptionStyle(option)}
                onPress={() => handleSelect(option)}
                disabled={!isActive || isCompleted}
              >
                <Text style={styles.optionText}>{option.text}</Text>
                {answered && selectedId === option.id && (
                  <Ionicons
                    name={option.isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={option.isCorrect ? COLORS.success : COLORS.error}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(0, 214, 143, 0.15)',
  },
  headerInfo: { flex: 1 },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  sublabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  question: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  options: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 214, 143, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  optionWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  optionCorrectReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 214, 143, 0.05)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 143, 0.3)',
  },
  optionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
