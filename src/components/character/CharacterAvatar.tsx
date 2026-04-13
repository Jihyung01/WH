import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { CharacterLoadout } from '../../types';
import type { CharacterMood } from '../../types/enums';
import {
  getCharacterImageUrl,
  getCharacterEmoji,
  getEvolutionStage,
  getDistrictTintOverlay,
  type EvolutionStage,
} from '../../utils/characterAssets';
import { COLORS, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';
import { useWeatherStore } from '../../stores/weatherStore';
import { getAmbientReaction } from '../../data/character-weather-reactions';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CharacterAvatarProps {
  characterType: string;
  level: number;
  size?: number;
  showEvolutionBadge?: boolean;
  /** 장착 코스메틱 preview_emoji 오버레이 */
  showLoadoutOverlay?: boolean;
  loadout?: CharacterLoadout[];
  favoriteDistrict?: string | null;
  nightExplorationHeavy?: boolean;
  mood?: CharacterMood;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** 지도 마커 등 레이아웃용 */
  borderColor?: string;
  backgroundColor?: string;
  /** false면 탭 애니메이션 없음(부모 Pressable과 중첩 방지) */
  interactive?: boolean;
  /** 날씨·시간 자동 오버레이·톤 (코스메틱과 별도) */
  applyWeatherAmbience?: boolean;
}

const SLOT_STYLE: Partial<
  Record<string, { top?: number; bottom?: number; left?: number; right?: number; fontSize: number }>
> = {
  hat: { top: -4, fontSize: 18 },
  accessory: { top: 4, right: -6, fontSize: 16 },
  outfit: { bottom: -2, fontSize: 14 },
  aura: { top: -8, left: -8, fontSize: 20 },
};

export function CharacterAvatar({
  characterType,
  level,
  size = 72,
  showEvolutionBadge = false,
  showLoadoutOverlay = true,
  loadout = [],
  favoriteDistrict,
  nightExplorationHeavy,
  mood = 'happy',
  onPress,
  style,
  borderColor = COLORS.border,
  backgroundColor = COLORS.surface,
  interactive = true,
  applyWeatherAmbience = true,
}: CharacterAvatarProps) {
  const currentWeather = useWeatherStore((s) => s.currentWeather);
  const temperature = useWeatherStore((s) => s.temperature);
  const weatherDataAvailable = useWeatherStore((s) => s.weatherDataAvailable);
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);

  const ambient = useMemo(
    () =>
      applyWeatherAmbience
        ? getAmbientReaction(characterType, currentWeather, timeOfDay, temperature, weatherDataAvailable)
        : null,
    [
      applyWeatherAmbience,
      characterType,
      currentWeather,
      timeOfDay,
      temperature,
      weatherDataAvailable,
    ],
  );

  const stage = getEvolutionStage(level);
  const uri = useMemo(() => getCharacterImageUrl(characterType, stage), [characterType, stage]);
  const emoji = useMemo(() => getCharacterEmoji(characterType, stage), [characterType, stage]);
  const [useEmoji, setUseEmoji] = useState(!uri);

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const tint = useMemo(
    () => getDistrictTintOverlay(favoriteDistrict ?? null, { nightExplorationHeavy }),
    [favoriteDistrict, nightExplorationHeavy],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const playMood = useCallback(() => {
    const wobble =
      mood === 'excited' || mood === 'happy'
        ? withSequence(withSpring(1.12, { damping: 6 }), withSpring(1, { damping: 8 }))
        : withSequence(withTiming(1.06, { duration: 90 }), withSpring(1, { damping: 10 }));
    scale.value = wobble;
    rotate.value = withSequence(
      withTiming(mood === 'tired' ? 0 : -6, { duration: 80 }),
      withTiming(mood === 'tired' ? 0 : 6, { duration: 100 }),
      withTiming(0, { duration: 80 }),
    );
  }, [mood, rotate, scale]);

  const handlePress = useCallback(() => {
    if (!interactive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playMood();
    onPress?.();
  }, [interactive, onPress, playMood]);

  const core = (
    <Animated.View style={[styles.wrap, { width: size, height: size, borderColor, backgroundColor }, animStyle]}>
      {showLoadoutOverlay &&
        loadout.some((l) => l.slot === 'background' && l.cosmetic?.preview_emoji) && (
          <Text style={styles.bgEmoji} pointerEvents="none">
            {loadout.find((l) => l.slot === 'background')?.cosmetic?.preview_emoji}
          </Text>
        )}

      {uri && !useEmoji ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}
          contentFit="cover"
          transition={120}
          onError={() => setUseEmoji(true)}
          onLoad={() => setUseEmoji(false)}
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.fallbackEmoji, { fontSize: size * 0.45 }]}>{emoji}</Text>
      )}

      {tint ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: size / 2,
              backgroundColor: tint.color,
              opacity: tint.opacity,
            },
          ]}
        />
      ) : null}

      {ambient?.morningBrightOpacity ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: size / 2,
              backgroundColor: 'rgba(255,255,255,0.95)',
              opacity: ambient.morningBrightOpacity,
            },
          ]}
        />
      ) : null}

      {ambient?.nightDimOpacity ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: size / 2,
              backgroundColor: 'rgba(8,12,28,0.92)',
              opacity: ambient.nightDimOpacity,
            },
          ]}
        />
      ) : null}

      {ambient?.overlayEmoji ? (
        <Text
          style={[styles.weatherOverlay, { fontSize: Math.max(14, size * 0.28), top: -Math.max(4, size * 0.06) }]}
          pointerEvents="none"
        >
          {ambient.overlayEmoji}
        </Text>
      ) : null}

      {showLoadoutOverlay &&
        loadout.map((row) => {
          const slot = row.slot;
          if (slot === 'background') return null;
          const e = row.cosmetic?.preview_emoji;
          if (!e) return null;
          const pos = SLOT_STYLE[slot];
          if (!pos) return null;
          return (
            <Text
              key={row.id}
              style={[
                styles.slotEmoji,
                {
                  fontSize: pos.fontSize,
                  top: pos.top,
                  bottom: pos.bottom,
                  left: pos.left,
                  right: pos.right,
                },
              ]}
              pointerEvents="none"
            >
              {e}
            </Text>
          );
        })}

      {showEvolutionBadge ? (
        <View style={[styles.evoBadge, { maxWidth: size + 8 }]}>
          <Text style={styles.evoBadgeText} numberOfLines={1}>
            {stage === 'baby' ? '✨' : stage === 'teen' ? '⭐' : stage === 'adult' ? '🌟' : '💫'}{' '}
            {stage}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );

  if (!interactive) {
    return <View style={style}>{core}</View>;
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={style}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel="캐릭터"
      hitSlop={8}
    >
      {core}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  image: {
    overflow: 'hidden',
  },
  fallbackEmoji: {
    textAlign: 'center',
  },
  bgEmoji: {
    ...StyleSheet.absoluteFillObject,
    fontSize: 42,
    textAlign: 'center',
    lineHeight: 80,
    opacity: 0.12,
  },
  slotEmoji: {
    position: 'absolute',
    zIndex: 4,
  },
  weatherOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 6,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  evoBadge: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 5,
  },
  evoBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'capitalize',
  },
});
