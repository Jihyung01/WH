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

  const handlePickPhoto = async (source: 'camera' | 'library') => {
    if (!isActive || busy) return;

    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          source === 'camera' ? '카메라 권한 필요' : '사진 권한 필요',
          source === 'camera'
            ? '설정에서 WhereHere의 카메라 접근 권한을 허용한 뒤 다시 시도해 주세요.'
            : '설정에서 WhereHere의 사진 접근 권한을 허용한 뒤 다시 시도해 주세요.',
        );
        return;
      }

      setBusy(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.85,
            });

      if (result.canceled) {
        return;
      }

      const uri = result.assets[0]?.uri;
      if (!uri) {
        Alert.alert('오류', '이미지 파일을 불러오지 못했습니다.');
        return;
      }

      await Promise.resolve(onComplete(uri));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('오류', '사진 선택 또는 업로드 중 문제가 발생했습니다.');
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
          <View style={styles.actions}>
            <Pressable
              style={[styles.captureBtn, busy && styles.captureBtnDisabled]}
              onPress={() => handlePickPhoto('camera')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <>
                  <Ionicons name="camera" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.captureBtnText}>사진 촬영</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.captureBtnSecondary, busy && styles.captureBtnDisabled]}
              onPress={() => handlePickPhoto('library')}
              disabled={busy}
            >
              <Ionicons name="image-outline" size={16} color={COLORS.textPrimary} />
              <Text style={styles.captureBtnText}>이미지 업로드</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.sublabel}>이전 단계를 먼저 완료해 주세요</Text>
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
  captureBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
    minWidth: 140,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
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
