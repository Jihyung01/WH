import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MANGA, MANGA_BORDER, MANGA_RADIUS, MANGA_SHADOW_OFFSET, FONT_FAMILY } from '../../config/theme';

/**
 * Spec §0.2 — 모든 액션 피드백용 토스트. 2.4초 표시.
 * 종이 칩 + 별 아이콘 + 잉크 외곽선 + hard shadow.
 *
 * 사용:
 *   import { showToast } from '@/components/ui/MangaToast';
 *   showToast('일기 저장됨');
 *   showToast('삭제됨', { tone: 'danger', icon: '⚠' });
 *
 * 단, 화면 어딘가에 한 번 <MangaToastHost /> 가 마운트돼 있어야 함.
 * (전역 RootLayout 에서 마운트 — Phase 1 에서 _layout.tsx 가 추가).
 */

// ──────────────────────────────────────────────────────────────
// External-event-driven singleton
// ──────────────────────────────────────────────────────────────
type Tone = 'paper' | 'success' | 'danger' | 'info';
type Payload = { id: number; text: string; tone: Tone; icon?: string };
type Listener = (p: Payload) => void;

const listeners = new Set<Listener>();
let _seq = 0;

export interface ToastOptions {
  tone?: Tone;
  icon?: string;
  /** 표시 지속 시간 ms (default 2400) */
  duration?: number;
}

export function showToast(text: string, opts: ToastOptions = {}) {
  if (!text) return;
  const payload: Payload = {
    id: ++_seq,
    text,
    tone: opts.tone ?? 'paper',
    icon: opts.icon ?? '✦',
  };
  listeners.forEach((l) => l(payload));
}

// ──────────────────────────────────────────────────────────────
// Host — 한 번만 마운트
// ──────────────────────────────────────────────────────────────
const TONE_BG: Record<Tone, string> = {
  paper:   MANGA.paper,
  success: MANGA.g,
  danger:  MANGA.r,
  info:    MANGA.b,
};

const TONE_FG: Record<Tone, string> = {
  paper:   MANGA.ink,
  success: MANGA.ink,
  danger:  MANGA.paper,
  info:    MANGA.ink,
};

function MangaToastHostInner() {
  const [active, setActive] = useState<Payload | null>(null);
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translate = useSharedValue(20);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setActive(null);
  }, []);

  useEffect(() => {
    const handle: Listener = (p) => {
      if (timeout.current) clearTimeout(timeout.current);
      setActive(p);
      opacity.value = 0;
      translate.value = 20;
      // animate in
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      translate.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
      // schedule dismiss
      const dur = 2400;
      timeout.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) });
        translate.value = withTiming(20, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) runOnJS(dismiss)();
        });
      }, dur);
    };
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [dismiss, opacity, translate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!active) return null;

  const bg = TONE_BG[active.tone];
  const fg = TONE_FG[active.tone];
  const offset = MANGA_SHADOW_OFFSET.md;

  // 토스트는 화면 하단 (탭바 위) 에 떠야 함.
  const bottom = (insets.bottom || 0) + 96; // 탭바 높이 ~76 + 여유 20

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.host,
        { bottom },
        animStyle,
      ]}
    >
      <View style={[styles.shadow, { top: offset, left: offset }]} />
      <View style={[styles.body, { backgroundColor: bg }]}>
        <Text style={[styles.icon, { color: fg }]} allowFontScaling={false}>
          {active.icon}
        </Text>
        <Text
          style={[styles.text, { color: fg }]}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {active.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.chipLg,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: MANGA_RADIUS.chipLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    maxWidth: 360,
  },
  icon: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
  text: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});

export const MangaToastHost = memo(MangaToastHostInner);
