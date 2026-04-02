import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { storage } from '../../stores/storage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BRAND,
  BORDER_RADIUS,
  SHADOWS,
} from '../../config/theme';

const STORAGE_KEY = 'tutorial_completed';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface TutorialStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  spotlightPosition: { top: number; left: number; width: number; height: number };
  tooltipPosition: 'top' | 'bottom';
}

const STEPS: TutorialStep[] = [
  {
    title: '지도 탐험',
    description:
      '주변의 이벤트를 지도에서 확인하세요! 가까운 마커를 탭하면 상세 정보를 볼 수 있어요.',
    icon: 'map-outline',
    spotlightPosition: {
      top: SCREEN_H * 0.25,
      left: SCREEN_W * 0.1,
      width: SCREEN_W * 0.8,
      height: SCREEN_H * 0.35,
    },
    tooltipPosition: 'bottom',
  },
  {
    title: 'GPS 체크인',
    description:
      '이벤트 장소에 도착하면 체크인 버튼이 활성화돼요. 100m 이내에서만 체크인할 수 있어요!',
    icon: 'location-outline',
    spotlightPosition: {
      top: SCREEN_H * 0.6,
      left: SCREEN_W * 0.2,
      width: SCREEN_W * 0.6,
      height: 64,
    },
    tooltipPosition: 'top',
  },
  {
    title: '미션 수행',
    description:
      '체크인 후 사진 촬영, 퀴즈 풀기 등 다양한 미션을 수행하세요. 미션을 완료하면 XP와 보상을 받아요!',
    icon: 'trophy-outline',
    spotlightPosition: {
      top: SCREEN_H * 0.3,
      left: SCREEN_W * 0.15,
      width: SCREEN_W * 0.7,
      height: SCREEN_H * 0.25,
    },
    tooltipPosition: 'bottom',
  },
  {
    title: '캐릭터 성장',
    description:
      'XP를 모아 캐릭터를 성장시키세요! 레벨이 오르면 새로운 기능이 열려요.',
    icon: 'sparkles-outline',
    spotlightPosition: {
      top: SCREEN_H - 88,
      left: SCREEN_W * 0.5,
      width: SCREEN_W * 0.25,
      height: 68,
    },
    tooltipPosition: 'top',
  },
  {
    title: '퀘스트 탭',
    description:
      '퀘스트 탭에서 주변 이벤트를 리스트로 확인하고, 카테고리별로 필터링할 수 있어요!',
    icon: 'compass-outline',
    spotlightPosition: {
      top: SCREEN_H - 88,
      left: 0,
      width: SCREEN_W * 0.25,
      height: 68,
    },
    tooltipPosition: 'top',
  },
];

// ── Hook ─────────────────────────────────────────────────────
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    try {
      const completed = storage.getBoolean(STORAGE_KEY);
      if (!completed) {
        setShowTutorial(true);
      }
    } catch {
      setShowTutorial(false);
    }
  }, []);

  const completeTutorial = useCallback(() => {
    storage.set(STORAGE_KEY, true);
    setShowTutorial(false);
  }, []);

  const resetTutorial = useCallback(() => {
    storage.delete(STORAGE_KEY);
    setShowTutorial(true);
  }, []);

  return { showTutorial, completeTutorial, resetTutorial };
}

// ── Component ────────────────────────────────────────────────
export interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function TutorialOverlay({
  visible,
  onComplete,
  onSkip,
}: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
      setStep(0);
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const handleSkip = useCallback(() => {
    setStep(0);
    onSkip();
  }, [onSkip]);

  if (!visible) return null;

  const { spotlightPosition, tooltipPosition } = current;

  const tooltipTop =
    tooltipPosition === 'top'
      ? spotlightPosition.top - 12
      : spotlightPosition.top + spotlightPosition.height + 12;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Dark overlay regions around spotlight */}
        {/* Top */}
        <View
          style={[
            styles.overlayBlock,
            { top: 0, left: 0, right: 0, height: spotlightPosition.top },
          ]}
        />
        {/* Bottom */}
        <View
          style={[
            styles.overlayBlock,
            {
              top: spotlightPosition.top + spotlightPosition.height,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        />
        {/* Left */}
        <View
          style={[
            styles.overlayBlock,
            {
              top: spotlightPosition.top,
              left: 0,
              width: spotlightPosition.left,
              height: spotlightPosition.height,
            },
          ]}
        />
        {/* Right */}
        <View
          style={[
            styles.overlayBlock,
            {
              top: spotlightPosition.top,
              left: spotlightPosition.left + spotlightPosition.width,
              right: 0,
              height: spotlightPosition.height,
            },
          ]}
        />

        {/* Spotlight border glow */}
        <View
          style={[
            styles.spotlightBorder,
            {
              top: spotlightPosition.top - 2,
              left: spotlightPosition.left - 2,
              width: spotlightPosition.width + 4,
              height: spotlightPosition.height + 4,
            },
          ]}
        />

        {/* Tooltip card */}
        <Animated.View
          key={`tooltip-${step}`}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.tooltipCard,
            {
              top: tooltipPosition === 'top' ? undefined : tooltipTop,
              bottom:
                tooltipPosition === 'top'
                  ? SCREEN_H - spotlightPosition.top + 12
                  : undefined,
              left: SPACING.xl,
              right: SPACING.xl,
            },
          ]}
        >
          {/* Icon + Title */}
          <View style={styles.tooltipHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name={current.icon} size={20} color={BRAND.primary} />
            </View>
            <Text style={styles.tooltipTitle}>{current.title}</Text>
          </View>

          <Text style={styles.tooltipDesc}>{current.description}</Text>

          {/* Actions */}
          <View style={styles.tooltipActions}>
            <Pressable onPress={handleSkip} hitSlop={8}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>

            <Pressable style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {isLast ? '시작하기' : '다음'}
              </Text>
              {!isLast && (
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Step counter */}
        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterText}>
            {step + 1} / {STEPS.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    position: 'relative',
  },
  overlayBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND.primary + '80',
  },

  tooltipCard: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  tooltipDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZE.md * 1.6,
    marginBottom: SPACING.lg,
  },

  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  nextBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#FFFFFF',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
  },
  dotActive: {
    backgroundColor: BRAND.primary,
    width: 20,
  },

  stepCounter: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: COLORS.surface + 'CC',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  stepCounterText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },
});
