import React, { memo } from 'react';
import { View, Platform, type ViewStyle, type StyleProp } from 'react-native';

import { MANGA, MANGA_BORDER, MANGA_RADIUS, MANGA_SHADOW_OFFSET } from '../../config/theme';

/**
 * 만화 톤의 hard ink shadow 가 적용된 카드.
 *
 * iOS: shadow* 속성으로 직접 그려 폰 sub-pixel 안 깨짐.
 * Android: react-native-maps marker bitmap 회귀 컨텍스트 + 일부 OEM 의 shadow
 *   처리 일관성 부족 → 'absolute View 한 장 오프셋' 트릭으로 픽셀 정확하게 재현.
 *   결과: 카드 본체 뒤에 ink 색 동일 모양 View 가 (offset, offset) 위치에 깔림.
 *
 * 사용 예:
 *   <InkCard radius="card" shadow="md" pad={16}>...</InkCard>
 */
interface Props {
  children: React.ReactNode;
  /** 배경색 (default paper) */
  background?: string;
  /** 외곽선 색 (default ink). 'none' 으로 외곽선 제거 가능 */
  borderColor?: string | 'none';
  /** 외곽선 두께 (default 2.5) */
  borderWidth?: number;
  /** 모서리 라운드 — MANGA_RADIUS key 또는 임의 px */
  radius?: keyof typeof MANGA_RADIUS | number;
  /** 그림자 사이즈 (sm=2, md=3, lg=4 px). 'none' 가능. */
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  /** 패딩 (number = 모든 방향 동일, 'none' = 0) */
  pad?: number | { v?: number; h?: number; t?: number; b?: number; l?: number; r?: number };
  /** 외부 wrap 스타일 (margin 등) */
  style?: StyleProp<ViewStyle>;
  /** 내부 컨텐츠 영역 스타일 */
  contentStyle?: StyleProp<ViewStyle>;
}

function resolveRadius(r: Props['radius']): number {
  if (typeof r === 'number') return r;
  if (r == null) return MANGA_RADIUS.card;
  return MANGA_RADIUS[r];
}

function resolveShadow(s: Props['shadow']): number {
  if (s == null || s === 'md') return MANGA_SHADOW_OFFSET.md;
  if (s === 'sm') return MANGA_SHADOW_OFFSET.sm;
  if (s === 'lg') return MANGA_SHADOW_OFFSET.lg;
  return 0; // 'none'
}

function resolvePad(p: Props['pad']): {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
} {
  if (p == null) return { paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14 };
  if (typeof p === 'number') return { paddingTop: p, paddingBottom: p, paddingLeft: p, paddingRight: p };
  return {
    paddingTop: p.t ?? p.v ?? 14,
    paddingBottom: p.b ?? p.v ?? 14,
    paddingLeft: p.l ?? p.h ?? 14,
    paddingRight: p.r ?? p.h ?? 14,
  };
}

function InkCardInner({
  children,
  background = MANGA.paper,
  borderColor = MANGA_BORDER.color,
  borderWidth = MANGA_BORDER.width,
  radius,
  shadow = 'md',
  pad,
  style,
  contentStyle,
}: Props) {
  const r = resolveRadius(radius);
  const offset = resolveShadow(shadow);
  const padding = resolvePad(pad);
  const useBorder = borderColor !== 'none';

  // wrap 컨테이너 = 그림자 자식이 정확한 위치를 갖게 하기 위한 relative anchor.
  // 외곽선 / 배경 / 패딩 은 본체 View 에만 적용. wrap 자체는 투명.
  return (
    <View style={[{ position: 'relative' }, style]}>
      {/* hard shadow underlay — 본체와 동일 형태를 (offset, offset) 위치에 ink 색으로 깔음. */}
      {offset > 0 ? (
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
        style={[
          {
            backgroundColor: background,
            borderRadius: r,
            ...(useBorder
              ? { borderWidth, borderColor: borderColor as string }
              : null),
            ...padding,
            // iOS 에서 추가로 미세 음영을 주려면 여기에 shadow* 를 더할 수 있음.
            // 하지만 스펙은 "hard shadow only" 라 의도적으로 비움.
            ...(Platform.OS === 'ios'
              ? {
                  // iOS 도 absolute underlay 가 그대로 동작 — 추가 처리 불필요
                }
              : null),
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const InkCard = memo(InkCardInner);
