import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface PhotoMissionProps {
  description: string;
  onComplete: (photoUri: string) => void;
  isActive: boolean;
  isCompleted: boolean;
}

export function PhotoMission({ description, onComplete, isActive, isCompleted }: PhotoMissionProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    if (!isActive) return;

    try {
      // In a real app, use expo-image-picker / expo-camera.
      // For demo, simulate a captured photo.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        '📸 사진 촬영',
        '데모 모드에서는 자동으로 완료됩니다.',
        [{
          text: '촬영 완료',
          onPress: () => {
            const mockUri = 'demo://photo-captured';
            setPhotoUri(mockUri);
            onComplete(mockUri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        }],
      );
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('오류', '사진 촬영 중 문제가 발생했습니다.');
    }
  };

  const iconColor = isCompleted ? COLORS.success : isActive ? COLORS.info : COLORS.textMuted;

  return (
    <View style={[styles.container, !isActive && !isCompleted && styles.containerDisabled]}>
      <View style={[styles.iconCircle, isCompleted && styles.iconCircleSuccess]}>
        <Ionicons
          name={isCompleted ? 'checkmark' : 'camera'}
          size={24}
          color={iconColor}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>{description}</Text>
        {isCompleted ? (
          <Text style={styles.sublabelSuccess}>사진 업로드 완료</Text>
        ) : isActive ? (
          <Pressable style={styles.captureBtn} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={16} color={COLORS.textPrimary} />
            <Text style={styles.captureBtnText}>사진 촬영하기</Text>
          </Pressable>
        ) : (
          <Text style={styles.sublabel}>이전 단계를 완료해주세요</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  containerDisabled: {
    opacity: 0.5,
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
  info: { flex: 1 },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sublabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  sublabelSuccess: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.success,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
  },
  captureBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
});
