import React, { memo } from 'react';
import { View, Text, type ViewStyle, type StyleProp, type TextStyle } from 'react-native';

import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY } from '../../config/theme';

/**
 * 5~8px radius 의 작은 잉크 칩.
 * 용도: 위치 라벨 / 시간 / 거리 / 공개범위 뱃지 / 카테고리 등.
 *
 * 외곽선 두께는 카드(2.5px) 보다 살짝 가늘게 1.6px → 시각 위계 차별.
 */
type Tone =
  | 'paper'    // 종이 + ink 라벨 (default 중립)
  | 'ink'      // ink 배경 + paper 라벨 (어두운 칩 — 위치 태그)
  | 'yellow'   // 노랑 (활성 / 강조)
  | 'red'      // 빨강 (좋아요 / 알림)
  | 'green'    // 초록 (성공 / 같이가기)
  | 'blue'     // 파랑 (정보)
  | 'purple';  // 퍼플

interface Props {
  children?: React.ReactNode;
  label?: string;
  tone?: Tone;
  /** 좌측 아이콘 노드 (이모지 텍스트 또는 SVG) */
  leadingIcon?: React.ReactNode;
  /** 우측 아이콘 노드 */
  trailingIcon?: React.ReactNode;
  /** 직접 색 override (tone 무시) */
  background?: string;
  textColor?: string;
  borderColor?: string;
  /** size — small (10px) / medium (11px) / large (12px) */
  size?: 'sm' | 'md' | 'lg';
  /** 외곽선 두께 (default 1.6) */
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const TONE: Record<Tone, { bg: string; fg: string }> = {
  paper:  { bg: MANGA.paper, fg: MANGA.ink },
  ink:    { bg: MANGA.ink,   fg: MANGA.paper },
  yellow: { bg: MANGA.y,     fg: MANGA.ink },
  red:    { bg: MANGA.r,     fg: MANGA.paper },
  green:  { bg: MANGA.g,     fg: MANGA.ink },
  blue:   { bg: MANGA.b,     fg: MANGA.ink },
  purple: { bg: MANGA.p,     fg: MANGA.ink },
};

const SIZE: Record<NonNullable<Props['size']>, { v: number; h: number; gap: number; font: number }> = {
  sm: { v: 2, h: 6, gap: 4, font: 10 },
  md: { v: 3, h: 8, gap: 5, font: 11 },
  lg: { v: 5, h: 10, gap: 6, font: 12 },
};

function MangaChipInner({
  children,
  label,
  tone = 'paper',
  leadingIcon,
  trailingIcon,
  background,
  textColor,
  borderColor = MANGA_BORDER.color,
  size = 'md',
  borderWidth = 1.6,
  style,
  textStyle,
}: Props) {
  const t = TONE[tone];
  const sz = SIZE[size];
  const bg = background ?? t.bg;
  const fg = textColor ?? t.fg;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderRadius: MANGA_RADIUS.chipLg,
          borderWidth,
          borderColor,
          paddingVertical: sz.v,
          paddingHorizontal: sz.h,
          gap: sz.gap,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {leadingIcon}
      {children ??
        (label != null ? (
          <Text
            style={[
              {
                color: fg,
                fontSize: sz.font,
                fontFamily: FONT_FAMILY.primaryBold,
                letterSpacing: -0.2,
                includeFontPadding: false,
                textAlignVertical: 'center',
              },
              textStyle,
            ]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null)}
      {trailingIcon}
    </View>
  );
}

export const MangaChip = memo(MangaChipInner);
