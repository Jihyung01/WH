import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useCharacterStore } from '../../stores/characterStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { getRandomDialogue } from '../../data/character-dialogues';
import type { DialogueSituation } from '../../data/character-dialogues';
import { getAmbientReaction } from '../../data/character-weather-reactions';
import { storage } from '../../stores/storage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOWS,
  BRAND,
} from '../../config/theme';

interface CharacterBubbleProps {
  situation: DialogueSituation;
  /** true면 상황별 랜덤 대사 대신 날씨·시간 반응 대사 */
  preferEnvironmentalLine?: boolean;
  /** 기본 60 — 지도 상단 아바타와 겹치지 않게 조정 */
  topOffset?: number;
  containerStyle?: ViewStyle;
}

const AUTO_HIDE_MS = 4000;

function getTodayKey(situation: DialogueSituation, env?: boolean): string {
  const date = new Date().toISOString().slice(0, 10);
  if (env) return `dialogue_env_${date}`;
  return `dialogue_shown_${date}_${situation}`;
}

export function CharacterBubble({
  situation,
  preferEnvironmentalLine,
  topOffset = 60,
  containerStyle,
}: CharacterBubbleProps) {
  const character = useCharacterStore((s) => s.character);
  const currentWeather = useWeatherStore((s) => s.currentWeather);
  const temperature = useWeatherStore((s) => s.temperature);
  const weatherDataAvailable = useWeatherStore((s) => s.weatherDataAvailable);
  const timeOfDay = useWeatherStore((s) => s.timeOfDay);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 250 });
    const id = setTimeout(() => setVisible(false), 260);
    return () => clearTimeout(id);
  }, [opacity]);

  useEffect(() => {
    if (!character) return;

    const key = getTodayKey(situation, preferEnvironmentalLine);
    if (storage.getBoolean(key)) return;

    const line = preferEnvironmentalLine
      ? getAmbientReaction(
          character.character_type,
          currentWeather,
          timeOfDay,
          temperature,
          weatherDataAvailable,
        ).line
      : getRandomDialogue(character.character_type, situation);
    setDialogue(line);
    setVisible(true);
    storage.set(key, true);

    const timer = setTimeout(dismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [
    character,
    situation,
    dismiss,
    preferEnvironmentalLine,
    currentWeather,
    temperature,
    weatherDataAvailable,
    timeOfDay,
  ]);

  if (!visible || !dialogue || !character) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(350).springify()}
      exiting={FadeOut.duration(250)}
      style={[styles.container, { top: topOffset }, containerStyle, animatedStyle]}
    >
      <Pressable style={styles.inner} onPress={dismiss}>
        <View style={styles.avatar}>
          <CharacterAvatar
            characterType={character.character_type}
            level={character.level ?? 1}
            size={36}
            showLoadoutOverlay={false}
            interactive={false}
            borderColor={BRAND.primary}
            backgroundColor={COLORS.surface}
          />
        </View>

        <View style={styles.bubble}>
          <View style={styles.caret} />
          <Text style={styles.text}>{dialogue}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 100,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  bubble: {
    flex: 1,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: BRAND.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  caret: {
    position: 'absolute',
    left: -8,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: BRAND.primary,
  },
  text: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.md * 1.5,
  },
});
