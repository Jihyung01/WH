import React, { memo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';

import { MANGA, MANGA_AVATAR_PALETTE, MANGA_BORDER, FONT_FAMILY } from '../../config/theme';

/**
 * Spec §0.3 — 닉네임 한글 첫 글자 기반 아바타 색상 자동 배정.
 *
 * 알고리즘: 첫 codepoint % 7 → MANGA_AVATAR_PALETTE 인덱스.
 * 한글 자모 codepoint 가 골고루 분포해 사용자 간 색이 일관 + 다양.
 */
export function avatarColor(name?: string | null): string {
  if (!name) return MANGA_AVATAR_PALETTE[0];
  const cp = name.codePointAt(0) ?? 0;
  return MANGA_AVATAR_PALETTE[cp % MANGA_AVATAR_PALETTE.length];
}

/** 한글 / 영어 / 이모지 모두에서 "첫 보이는 글자" 1자 추출. */
export function avatarInitial(name?: string | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // surrogate pair / 결합 문자 안전: codepoint 단위
  const cp = trimmed.codePointAt(0);
  if (cp == null) return trimmed[0] ?? '?';
  return String.fromCodePoint(cp);
}

interface Props {
  /** 닉네임 (한글 권장). 첫 글자가 표시되고 색이 자동 배정됨. */
  name?: string | null;
  /** 명시적 색 override (친구 행에서 색 고정 필요할 때) */
  color?: string;
  /** 명시적 이니셜 override */
  initial?: string;
  /** 이미지 URI 가 있으면 이미지로 표시, 실패 시 이니셜 fallback */
  imageUrl?: string | null;
  /** 외경 픽셀 (default 44) */
  size?: number;
  /** 잉크 외곽선 두께 (default 2.5) */
  borderWidth?: number;
  /** 외곽선 색 (default ink) */
  borderColor?: string;
  /** 우상단 LED dot — 'online' (g) | 'offline' (none) | 'recent' (y) */
  status?: 'online' | 'offline' | 'recent';
  style?: StyleProp<ViewStyle>;
}

function MangaAvatarInner({
  name,
  color,
  initial,
  imageUrl,
  size = 44,
  borderWidth = MANGA_BORDER.width,
  borderColor = MANGA_BORDER.color,
  status = 'offline',
  style,
}: Props) {
  const bg = color ?? avatarColor(name);
  const txt = initial ?? avatarInitial(name);
  const radius = size / 2;
  const fontSize = Math.round(size * 0.42);
  const dotSize = Math.max(8, Math.round(size * 0.22));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          borderWidth,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: size - borderWidth * 2,
            height: size - borderWidth * 2,
            borderRadius: radius,
          }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <Text
          style={[
            styles.initial,
            { fontSize, lineHeight: fontSize * 1.05 },
          ]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {txt}
        </Text>
      )}

      {status === 'online' || status === 'recent' ? (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: status === 'online' ? MANGA.g : MANGA.y,
            borderWidth: 2,
            borderColor: MANGA.ink,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    color: MANGA.ink,
    fontFamily: FONT_FAMILY.display, // BagelFatOne — 굵은 만화 글자감
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export const MangaAvatar = memo(MangaAvatarInner);
