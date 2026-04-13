import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, Modal, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCharacterStore } from '../../stores/characterStore';
import { CharacterAvatar } from './CharacterAvatar';
import { EVOLUTION_STAGE_LABEL_EN } from '../../utils/characterAssets';
import type { EvolutionStage } from '../../utils/characterAssets';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';

export function EvolutionCelebrationOverlay() {
  const celebration = useCharacterStore((s) => s.evolutionCelebration);
  const clear = useCharacterStore((s) => s.clearEvolutionCelebration);
  const { width } = useWindowDimensions();

  const flash = useSharedValue(0);
  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const dismiss = useCallback(() => {
    clear();
  }, [clear]);

  useEffect(() => {
    if (!celebration) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flash.value = withSequence(
      withTiming(0.85, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 400 }),
    );
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, [celebration, cardOpacity, cardScale, flash]);

  if (!celebration) return null;

  const prev = EVOLUTION_STAGE_LABEL_EN[celebration.prevStage as EvolutionStage];
  const next = EVOLUTION_STAGE_LABEL_EN[celebration.nextStage as EvolutionStage];

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            flashStyle,
            { backgroundColor: '#FBBF24' },
          ]}
        />
        <Animated.View style={[styles.cardWrap, { width: width * 0.86 }, cardStyle]}>
          <LinearGradient
            colors={[BRAND.primary, '#0D9488']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.title}>진화!</Text>
            <CharacterAvatar
              characterType={celebration.characterType}
              level={celebration.newLevel}
              size={120}
              showLoadoutOverlay={false}
              favoriteDistrict={celebration.favoriteDistrict}
              borderColor="rgba(255,255,255,0.5)"
              backgroundColor="rgba(255,255,255,0.15)"
            />
            <Text style={styles.line}>
              {celebration.characterName}이(가) 진화했어요!
            </Text>
            <Text style={styles.sub}>
              {prev} → {next} {getTypeEmoji(celebration.characterType)}
            </Text>
            <Pressable style={styles.btn} onPress={dismiss}>
              <Text style={styles.btnText}>확인</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function getTypeEmoji(t: string): string {
  if (t === 'explorer') return '🌿';
  if (t === 'foodie') return '💨';
  if (t === 'artist') return '☀️';
  if (t === 'socialite') return '⭐';
  return '✨';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  cardWrap: {
    maxWidth: 400,
  },
  card: {
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFFFFF',
  },
  line: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sub: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  btn: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
  },
  btnText: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
});
