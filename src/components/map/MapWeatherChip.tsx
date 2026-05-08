import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { MANGA, MANGA_BORDER, MANGA_RADIUS, MANGA_SHADOW_OFFSET, FONT_FAMILY } from '../../config/theme';

/**
 * 좌상단 날씨 chip (Spec §1.1).
 *
 * 디자인:
 *   - 종이 배경 + 잉크 외곽선 + hard shadow
 *   - 날씨 아이콘(이모지) + "조건 + N°" 라벨
 *   - 탭 시 사이클 (sunny → cloudy → rainy → snowy → ...)
 */

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'night' | 'unknown';

const ICON: Record<WeatherCondition, string> = {
  sunny:   '☀',
  cloudy:  '☁',
  rainy:   '☂',
  snowy:   '❄',
  night:   '☾',
  unknown: '◌',
};

const LABEL_KO: Record<WeatherCondition, string> = {
  sunny:   '맑음',
  cloudy:  '흐림',
  rainy:   '비',
  snowy:   '눈',
  night:   '밤',
  unknown: '날씨',
};

interface Props {
  condition: WeatherCondition;
  /** 섭씨 기온 (옵션). 없으면 라벨만 노출 */
  temperatureC?: number | null;
  onPress?: () => void;
}

function MapWeatherChipInner({ condition, temperatureC, onPress }: Props) {
  const offset = MANGA_SHADOW_OFFSET.sm;
  const icon = ICON[condition] ?? ICON.unknown;
  const label = LABEL_KO[condition] ?? LABEL_KO.unknown;
  const tempStr =
    typeof temperatureC === 'number' && Number.isFinite(temperatureC)
      ? `${Math.round(temperatureC)}°`
      : null;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.wrap,
        { transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined },
      ]}
    >
      <View style={[styles.shadow, { top: offset, left: offset }]} />
      <View style={styles.body}>
        <Text style={styles.icon} allowFontScaling={false}>{icon}</Text>
        <Text style={styles.label} allowFontScaling={false}>{label}</Text>
        {tempStr ? (
          <Text style={styles.temp} allowFontScaling={false}>{tempStr}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const HEIGHT = 36;

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: HEIGHT / 2,
  },
  body: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MANGA.paper,
    borderRadius: HEIGHT / 2,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    paddingHorizontal: 12,
    gap: 6,
  },
  icon: {
    fontSize: 16,
    color: MANGA.ink,
    includeFontPadding: false,
  },
  label: {
    color: MANGA.ink,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  temp: {
    color: MANGA.r,
    fontSize: 13,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
});

export const MapWeatherChip = memo(MapWeatherChipInner);
