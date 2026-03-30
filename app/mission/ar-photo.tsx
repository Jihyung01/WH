import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { BRAND, COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import CameraOverlay, { type FrameType } from '../../src/components/ar/CameraOverlay';

const { width: SCREEN_W } = Dimensions.get('window');

const TIPS: Record<string, string[]> = {
  landscape: [
    '수평선을 그리드의 1/3 지점에 맞춰보세요',
    '전경에 흥미로운 요소를 배치하세요',
    '골든아워에 촬영하면 더욱 멋진 사진이 됩니다',
  ],
  building: [
    '건물의 수직선이 기울어지지 않게 주의하세요',
    '대칭을 활용하면 강한 인상을 줄 수 있습니다',
    '하늘을 배경으로 활용해보세요',
  ],
  food: [
    '자연광 아래에서 촬영해보세요',
    '45도 각도가 가장 맛있어 보입니다',
    '배경을 깔끔하게 정리하세요',
  ],
  selfie: [
    '자연광을 정면에서 받으면 가장 좋습니다',
    '카메라를 눈높이보다 살짝 위에 두세요',
    '자연스러운 표정이 가장 좋아요',
  ],
  default: [
    '주제를 명확하게 포착하세요',
    '배경이 깔끔한 곳을 찾아보세요',
    '다양한 각도에서 시도해보세요',
  ],
};

const FRAME_LABELS: Record<string, string> = {
  landscape: '🏞 풍경 모드',
  building: '🏛 건축물 모드',
  food: '🍽 음식 모드',
  selfie: '🤳 셀피 모드',
  default: '📷 기본 모드',
};

export default function ARPhotoScreen() {
  const router = useRouter();
  const { missionId, prompt, frameType: rawFrame } = useLocalSearchParams<{
    missionId: string;
    prompt: string;
    frameType?: string;
  }>();

  const frameType: FrameType = (['landscape', 'building', 'food', 'selfie'].includes(rawFrame ?? '')
    ? rawFrame
    : 'default') as FrameType;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const captureScale = useSharedValue(1);
  const captureAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const flashIcons: Record<FlashMode, string> = { auto: 'flash', on: 'flash', off: 'flash-off' };
  const flashLabels: Record<FlashMode, string> = { auto: 'AUTO', on: 'ON', off: 'OFF' };
  const flashCycle: FlashMode[] = ['auto', 'on', 'off'];

  const toggleFlash = useCallback(() => {
    setFlash((prev) => {
      const idx = flashCycle.indexOf(prev);
      return flashCycle[(idx + 1) % flashCycle.length];
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    captureScale.value = withSequence(
      withSpring(0.85, { damping: 15, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );

    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: Platform.OS === 'android',
      });
      if (result?.uri) {
        setPhotoUri(result.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('Capture failed:', err);
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const handleRetake = useCallback(() => {
    setPhotoUri(null);
  }, []);

  const handleUsePhoto = useCallback(() => {
    if (!photoUri) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [photoUri, router]);

  // ── Permission states ──
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.permTitle}>카메라 권한이 필요합니다</Text>
        <Text style={styles.permSub}>AR 포토 미션을 위해 카메라 접근을 허용해주세요</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>권한 허용하기</Text>
        </Pressable>
        <Pressable style={styles.permBtnSecondary} onPress={() => router.back()}>
          <Text style={styles.permBtnSecondaryText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Preview mode (after capture) ──
  if (photoUri) {
    return (
      <View style={styles.fill}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />

        {/* WhereHere branded frame border */}
        <View style={styles.brandedFrame} pointerEvents="none">
          <LinearGradient
            colors={['rgba(45,212,168,0.4)', 'transparent', 'transparent', 'rgba(45,212,168,0.3)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Watermark */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.watermark}>
          <Text style={styles.watermarkText}>WhereHere</Text>
        </Animated.View>

        {/* Action buttons */}
        <SafeAreaView style={styles.previewActions}>
          <Pressable style={styles.retakeBtn} onPress={handleRetake}>
            <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
            <Text style={styles.retakeBtnText}>다시 찍기</Text>
          </Pressable>

          <Pressable style={styles.usePhotoBtn} onPress={handleUsePhoto}>
            <Text style={styles.usePhotoBtnText}>이 사진 사용</Text>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.background} />
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // ── Camera mode ──
  const tips = TIPS[frameType] ?? TIPS.default;

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={styles.fill}
        facing={facing}
        flash={flash}
      >
        {/* AR overlay */}
        <CameraOverlay frameType={frameType} />

        {/* Top gradient for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.topGradient}
        />

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bottomGradient}
        />

        {/* Close button */}
        <SafeAreaView style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          <View style={styles.frameLabel}>
            <Text style={styles.frameLabelText}>{FRAME_LABELS[frameType] ?? FRAME_LABELS.default}</Text>
          </View>

          <View style={styles.topRight}>
            <Pressable style={styles.iconBtn} onPress={toggleFlash}>
              <Ionicons name={flashIcons[flash] as any} size={22} color="#fff" />
              <Text style={styles.flashLabel}>{flashLabels[flash]}</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Mission prompt card */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.promptCard}>
          <Text style={styles.promptText} numberOfLines={2}>
            {prompt || '미션 사진을 촬영하세요'}
          </Text>
        </Animated.View>

        {/* Tips panel */}
        <View style={styles.tipsArea}>
          <Pressable style={styles.tipToggle} onPress={() => setTipsOpen((v) => !v)}>
            <Ionicons name="bulb-outline" size={16} color={BRAND.primary} />
            <Text style={styles.tipToggleText}>촬영 팁</Text>
            <Ionicons name={tipsOpen ? 'chevron-down' : 'chevron-up'} size={14} color={COLORS.textMuted} />
          </Pressable>
          {tipsOpen && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.tipsPanel}>
              {tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Bottom controls */}
        <SafeAreaView style={styles.bottomBar}>
          <Pressable style={styles.iconBtnLg} onPress={toggleCamera}>
            <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
          </Pressable>

          {/* Capture button */}
          <Animated.View style={captureAnimStyle}>
            <Pressable style={styles.captureBtn} onPress={handleCapture} disabled={capturing}>
              <View style={styles.captureInner}>
                {capturing && <ActivityIndicator size="small" color={BRAND.primary} />}
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.iconBtnLg} />
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },

  /* Permission */
  permTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  permSub: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  permBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  permBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.background,
  },
  permBtnSecondary: {
    paddingVertical: SPACING.md,
  },
  permBtnSecondaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  /* Top bar */
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  topRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnLg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashLabel: {
    fontSize: 8,
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
    position: 'absolute',
    bottom: 4,
  },
  frameLabel: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  frameLabelText: {
    fontSize: FONT_SIZE.sm,
    color: '#fff',
    fontWeight: FONT_WEIGHT.medium,
  },

  /* Mission prompt */
  promptCard: {
    position: 'absolute',
    top: 110,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
    ...SHADOWS.md,
  },
  promptText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#F1F5F9',
    lineHeight: FONT_SIZE.md * 1.5,
  },

  /* Tips */
  tipsArea: {
    position: 'absolute',
    bottom: 180,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  tipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  tipToggleText: {
    fontSize: FONT_SIZE.sm,
    color: '#fff',
    fontWeight: FONT_WEIGHT.medium,
  },
  tipsPanel: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tipDot: {
    color: BRAND.primary,
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: FONT_SIZE.sm * 1.5,
  },

  /* Bottom controls */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Preview mode */
  previewImage: {
    flex: 1,
  },
  brandedFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: BRAND.primary,
    borderRadius: 2,
  },
  watermark: {
    position: 'absolute',
    bottom: 140,
    right: SPACING.xl,
    opacity: 0.6,
  },
  watermarkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    letterSpacing: 2,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: SPACING.lg,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  retakeBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  usePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  usePhotoBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.background,
  },
});
