import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

interface PhotoMissionProps {
  description: string;
  onComplete: (photoUri: string) => void | Promise<void>;
  isActive: boolean;
  isCompleted: boolean;
}

export function PhotoMission({ description, onComplete, isActive, isCompleted }: PhotoMissionProps) {
  const [busy, setBusy] = useState(false);

  const handleTakePhoto = async () => {
    if (!isActive || busy) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '카메라 권한 필요',
          '설정에서 WhereHere의 카메라 접근을 허용한 뒤 다시 시도해 주세요.',
        );
        return;
      }

      setBusy(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const uri = result.assets[0]?.uri;
      if (!uri) {
        Alert.alert('오류', '사진을 가져오지 못했습니다.');
        return;
      }

      await Promise.resolve(onComplete(uri));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('오류', '사진 촬영 중 문제가 발생했습니다.');
    } finally {
      setBusy(false);
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
          <Pressable
            style={[styles.captureBtn, busy && styles.captureBtnDisabled]}
            onPress={handleTakePhoto}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <>
                <Ionicons name="camera" size={16} color={COLORS.textPrimary} />
                <Text style={styles.captureBtnText}>사진 촬영하기</Text>
              </>
            )}
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
    minWidth: 140,
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.85,
  },
  captureBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
});
