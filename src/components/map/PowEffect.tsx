import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { MANGA, MANGA_BORDER, FONT_FAMILY } from '../../config/theme';

/**
 * Spec §1.2 — 새 장소 발견 / 챌린지 클리어 / 레벨업 시 화면 중앙에 만화 효과음 SVG.
 *
 * 디자인:
 *   - 노란 폭발(burst) SVG 모양 + 잉크 외곽선
 *   - 안쪽에 효과음 텍스트 ("EVENT!", "DISCOVERED!", "+20 EXP" 등)
 *   - 1.6초 동안 등장(scale 0→1.1→1) → 짧게 머물고 → 페이드 아웃
 *
 * 사용:
 *   const ref = useRef<PowEffectHandle>(null);
 *   <PowEffect ref={ref} />
 *   // 어디서든 ref.current?.fire('EVENT!') 호출.
 *
 * iOS / Android 모두 SVG burst polygon 안전 (지도 마커 캡처 컨텍스트 아님 →
 * 일반 화면 오버레이라 SVG 깨지는 OEM 케이스 없음).
 */

export interface PowEffectHandle {
  fire: (message: string, opts?: { tone?: 'yellow' | 'red' | 'green' | 'blue'; subText?: string }) => void;
}

const TONES = {
  yellow: { fill: MANGA.y, text: MANGA.ink },
  red:    { fill: MANGA.r, text: MANGA.paper },
  green:  { fill: MANGA.g, text: MANGA.ink },
  blue:   { fill: MANGA.b, text: MANGA.ink },
} as const;

// 12-point burst polygon points. Render at 200x200 viewBox.
const BURST_POINTS =
  '100,4 116,40 154,30 138,68 184,60 156,98 200,108 152,126 188,168 140,150 138,196 110,160 96,200 76,166 52,196 56,148 8,150 50,118 0,98 48,82 14,38 60,52 50,8';

interface FireState {
  message: string;
  subText?: string;
  tone: keyof typeof TONES;
}

const PowEffect = forwardRef<PowEffectHandle, { size?: number }>(function PowEffect(
  { size = 220 },
  ref,
) {
  const [active, setActive] = useState<FireState | null>(null);
  const scale = useSharedValue(0);
  const rot = useSharedValue(-8);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    fire: (message, opts) => {
      if (timer.current) clearTimeout(timer.current);
      setActive({ message, subText: opts?.subText, tone: opts?.tone ?? 'yellow' });

      scale.value = 0;
      rot.value = -8;
      opacity.value = 0;
      // 등장
      opacity.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
      scale.value = withSequence(
        withTiming(1.15, { duration: 220, easing: Easing.out(Easing.back(2)) }),
        withTiming(1.0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
      );
      rot.value = withSequence(
        withTiming(6, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
      );

      // 1.0초 머물고 → 페이드아웃
      timer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) });
        scale.value = withTiming(1.2, { duration: 280, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) runOnJS(setActive)(null);
        });
      }, 1000);
    },
  }));

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  if (!active) return null;
  const tone = TONES[active.tone];

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.burst, animStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {/* shadow polygon (offset 4px) */}
          <Polygon
            points={BURST_POINTS}
            fill={MANGA.ink}
            transform="translate(4,4)"
          />
          {/* main polygon */}
          <Polygon
            points={BURST_POINTS}
            fill={tone.fill}
            stroke={MANGA_BORDER.color}
            strokeWidth={MANGA_BORDER.width}
            strokeLinejoin="round"
          />
        </Svg>
        {/* center text */}
        <View style={styles.label}>
          <Text
            style={[styles.message, { color: tone.text }]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {active.message}
          </Text>
          {active.subText ? (
            <Text
              style={[styles.subText, { color: tone.text }]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {active.subText}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  burst: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -1,
    includeFontPadding: false,
    textAlign: 'center',
  },
  subText: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
});

export { PowEffect };
