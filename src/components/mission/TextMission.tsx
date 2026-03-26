import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface TextMissionProps {
  description: string;
  minLength?: number;
  onComplete: (text: string) => void;
  isActive: boolean;
  isCompleted: boolean;
}

const DEFAULT_MIN = 20;

export function TextMission({ description, minLength = DEFAULT_MIN, onComplete, isActive, isCompleted }: TextMissionProps) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isValid = text.length >= minLength;

  const handleSubmit = () => {
    if (!isValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    onComplete(text);
  };

  const iconColor = isCompleted ? COLORS.success : isActive ? COLORS.warning : COLORS.textMuted;

  return (
    <View style={[styles.container, !isActive && !isCompleted && styles.containerDisabled]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, isCompleted && styles.iconCircleSuccess]}>
          <Ionicons
            name={isCompleted ? 'checkmark' : 'create'}
            size={24}
            color={iconColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.label}>{description}</Text>
          {!isActive && !isCompleted && (
            <Text style={styles.sublabel}>이전 단계를 완료해주세요</Text>
          )}
        </View>
      </View>

      {isActive && !isCompleted && !submitted && (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="여기에 작성해주세요..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={200}
          />
          <View style={styles.inputFooter}>
            <Text style={[styles.charCount, isValid && styles.charCountValid]}>
              {text.length}/{minLength}자 이상
            </Text>
            <Pressable
              style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={styles.submitBtnText}>제출</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isCompleted && (
        <Text style={styles.submittedText}>"{text || '작성 완료'}"</Text>
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
  containerDisabled: { opacity: 0.5 },
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
  inputArea: {
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  charCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  charCountValid: {
    color: COLORS.success,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  submittedText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
});
