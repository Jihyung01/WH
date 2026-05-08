import React, { memo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MANGA, MANGA_BORDER, MANGA_SHADOW_OFFSET } from '../../config/theme';

/**
 * 지도 우측 FAB 스택 (Spec §1.1).
 *
 * 4개 버튼 (위→아래):
 *   1. 레이어 / 카테고리 필터 (종이 / ink 글리프)
 *   2. 이벤트 만들기 (✏️ — 노랑 / 메인 액션)
 *   3. 흔적 만들기 (👣 — 종이)
 *   4. 내 위치 (📍 / 빨강 — 가장 자주 쓰는 액션이라 시각 강조)
 */

const FAB_SIZE = 48;

type Variant = 'paper' | 'yellow' | 'red' | 'blue';

const BG: Record<Variant, string> = {
  paper:  MANGA.paper,
  yellow: MANGA.y,
  red:    MANGA.r,
  blue:   MANGA.b,
};

const FG: Record<Variant, string> = {
  paper:  MANGA.ink,
  yellow: MANGA.ink,
  red:    MANGA.paper,
  blue:   MANGA.ink,
};

interface FabProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  variant?: Variant;
  onPress?: () => void;
  /** 우상단 작은 도트 뱃지 */
  badge?: boolean;
  accessibilityLabel?: string;
}

const Fab = memo(function Fab({
  iconName,
  variant = 'paper',
  onPress,
  badge,
  accessibilityLabel,
}: FabProps) {
  const offset = MANGA_SHADOW_OFFSET.md;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.wrap,
        { transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined },
      ]}
    >
      <View style={[styles.shadow, { top: offset, left: offset }]} />
      <View
        style={[
          styles.body,
          { backgroundColor: BG[variant] },
        ]}
      >
        <Ionicons name={iconName} size={22} color={FG[variant]} />
        {badge ? (
          <View style={styles.badge} />
        ) : null}
      </View>
    </Pressable>
  );
});

interface Props {
  onLayerPress?: () => void;
  onCreateEventPress?: () => void;
  onCreateTracePress?: () => void;
  onLocationPress?: () => void;
  /** 레이어 필터에 활성화된 카테고리가 있으면 도트 표시 */
  layerActive?: boolean;
}

function MapFabStackInner({
  onLayerPress,
  onCreateEventPress,
  onCreateTracePress,
  onLocationPress,
  layerActive,
}: Props) {
  return (
    <View style={styles.stack}>
      <Fab
        iconName="layers-outline"
        variant="paper"
        onPress={onLayerPress}
        badge={layerActive}
        accessibilityLabel="레이어 필터"
      />
      <Fab
        iconName="create"
        variant="yellow"
        onPress={onCreateEventPress}
        accessibilityLabel="이벤트 만들기"
      />
      <Fab
        iconName="footsteps"
        variant="paper"
        onPress={onCreateTracePress}
        accessibilityLabel="흔적 남기기"
      />
      <Fab
        iconName="locate"
        variant="red"
        onPress={onLocationPress}
        accessibilityLabel="내 위치로 이동"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
    gap: 14,
    alignItems: 'flex-end',
  },
  wrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: MANGA.ink,
  },
  body: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: MANGA.r,
    borderWidth: 1.5,
    borderColor: MANGA.ink,
  },
});

export const MapFabStack = memo(MapFabStackInner);
