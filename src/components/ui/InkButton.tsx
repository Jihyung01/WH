import React, { memo, useState } from 'react';
import {
  Pressable,
  View,
  Text,
  Platform,
  type ViewStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  FONT_FAMILY,
} from '../../config/theme';

/**
 * 만화 톤의 hard-shadow 도장 누르기 버튼.
 * pressed 상태에서 translate(offset, offset) + 그림자 사라짐 → 도장 박는 느낌.
 * iOS / Android 양쪽에서 픽셀 정확하게 동작 (absolute underlay 트릭).
 */
type Variant = 'primary' | 'secondary' | 'paper' | 'danger' | 'success' | 'info';

interface Props {
  /** 버튼 라벨 (children 으로도 가능) */
  label?: string;
  /** 좌측 아이콘 노드 */
  leadingIcon?: React.ReactNode;
  /** 우측 아이콘 노드 */
  trailingIcon?: React.ReactNode;
  /** 직접 children 넘기면 라벨 대신 사용 */
  children?: React.ReactNode;

  variant?: Variant;
  /** primary / secondary / paper / danger / success / info 가 아닌 임의 색 */
  background?: string;
  /** 라벨 색 (default ink) */
  labelColor?: string;

  /** 사이즈 (default md) */
  size?: 'sm' | 'md' | 'lg';

  /** 그림자 오프셋 (default md=3) */
  shadow?: 'sm' | 'md' | 'lg';

  /** 카드 모서리 (default chip) */
  radius?: keyof typeof MANGA_RADIUS | number;

  /** 100% 너비 */
  fullWidth?: boolean;

  /** disabled — 그림자 / 클릭 비활성화 */
  disabled?: boolean;

  onPress?: (e: GestureResponderEvent) => void;

  /** 햅틱 ('light' | 'medium' | 'none', default light) */
  haptic?: 'light' | 'medium' | 'none';

  /** 외부 wrap 스타일 */
  style?: StyleProp<ViewStyle>;
}

const VARIANT_BG: Record<Variant, string> = {
  primary:   MANGA.y,    // 노랑 = 메인 액션
  secondary: MANGA.paper, // 종이 = 중립
  paper:     MANGA.paper,
  danger:    MANGA.r,    // 빨강 = 위험 / 좋아요
  success:   MANGA.g,    // 초록 = 성공 / 같이가기
  info:      MANGA.b,    // 파랑 = 정보
};

function resolveRadius(r: Props['radius']): number {
  if (typeof r === 'number') return r;
  if (r == null) return MANGA_RADIUS.chip;
  return MANGA_RADIUS[r];
}

function resolveShadow(s: Props['shadow']): number {
  if (s == null || s === 'md') return MANGA_SHADOW_OFFSET.md;
  if (s === 'sm') return MANGA_SHADOW_OFFSET.sm;
  return MANGA_SHADOW_OFFSET.lg;
}

const SIZE_PADDING: Record<NonNullable<Props['size']>, { v: number; h: number; font: number }> = {
  sm: { v: 6, h: 12, font: 12 },
  md: { v: 10, h: 16, font: 14 },
  lg: { v: 14, h: 20, font: 16 },
};

function InkButtonInner({
  label,
  leadingIcon,
  trailingIcon,
  children,
  variant = 'primary',
  background,
  labelColor = MANGA.ink,
  size = 'md',
  shadow = 'md',
  radius = 'chip',
  fullWidth,
  disabled,
  onPress,
  haptic = 'light',
  style,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const r = resolveRadius(radius);
  const offset = resolveShadow(shadow);
  const bg = background ?? VARIANT_BG[variant];
  const sz = SIZE_PADDING[size];

  const handlePressIn = () => {
    if (disabled) return;
    setPressed(true);
    if (haptic !== 'none' && Platform.OS === 'ios') {
      Haptics.impactAsync(
        haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
  };
  const handlePressOut = () => setPressed(false);

  const showShadow = !pressed && !disabled && offset > 0;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          position: 'relative',
          opacity: disabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {/* hard shadow underlay (pressed 시 사라짐) */}
      {showShadow ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: offset,
            left: offset,
            right: -offset,
            bottom: -offset,
            backgroundColor: MANGA.ink,
            borderRadius: r,
          }}
        />
      ) : null}

      {/* 본체 */}
      <View
        style={{
          backgroundColor: bg,
          borderRadius: r,
          borderWidth: MANGA_BORDER.width,
          borderColor: MANGA_BORDER.color,
          paddingVertical: sz.v,
          paddingHorizontal: sz.h,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          // pressed 시 underlay 자리로 살짝 이동 = 도장 박는 느낌
          transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined,
        }}
      >
        {leadingIcon}
        {children ??
          (label != null ? (
            <Text
              style={{
                color: labelColor,
                fontSize: sz.font,
                fontFamily: FONT_FAMILY.primaryBold,
                letterSpacing: -0.2,
                includeFontPadding: false,
              }}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null)}
        {trailingIcon}
      </View>
    </Pressable>
  );
}

export const InkButton = memo(InkButtonInner);
