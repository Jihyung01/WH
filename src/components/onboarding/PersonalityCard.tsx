import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { QuizCardDef, QuizOption } from '../../data/personality-quiz';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../config/theme';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE = 72;

type Side = 'left' | 'right';

interface Props {
  card: QuizCardDef;
  onPick: (keyword: import('../../data/personality-quiz').PersonalityKeyword) => void;
}

export function PersonalityCard({ card, onPick }: Props) {
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);
  const leftOpacity = useSharedValue(1);
  const rightOpacity = useSharedValue(1);

  const animatePick = useCallback(
    (side: Side) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const picked = side === 'left' ? card.left : card.right;
      const other = side === 'left' ? card.right : card.left;
      void picked;
      void other;
      if (side === 'left') {
        leftScale.value = withSpring(1.04, { damping: 14, stiffness: 220 });
        rightScale.value = withSpring(0.94, { damping: 14, stiffness: 220 });
        rightOpacity.value = withTiming(0.45, { duration: 180 });
      } else {
        rightScale.value = withSpring(1.04, { damping: 14, stiffness: 220 });
        leftScale.value = withSpring(0.94, { damping: 14, stiffness: 220 });
        leftOpacity.value = withTiming(0.45, { duration: 180 });
      }
      const kw = side === 'left' ? card.left.keyword : card.right.keyword;
      setTimeout(() => {
        onPick(kw);
        leftScale.value = 1;
        rightScale.value = 1;
        leftOpacity.value = 1;
        rightOpacity.value = 1;
      }, 320);
    },
    [card, leftOpacity, leftScale, onPick, rightOpacity, rightScale],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .onEnd((e) => {
      if (e.translationX > SWIPE) {
        runOnJS(animatePick)('right');
      } else if (e.translationX < -SWIPE) {
        runOnJS(animatePick)('left');
      }
    });

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale.value }],
    opacity: leftOpacity.value,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale.value }],
    opacity: rightOpacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        <Text style={styles.hint}>화면을 탭하거나 좌우로 스와이프해요</Text>
        <View style={styles.row}>
          <Pressable style={styles.half} onPress={() => animatePick('left')}>
            <Animated.View style={[styles.cardWrap, leftStyle]}>
              <LinearGradient colors={card.gradientLeft} style={styles.card}>
                <OptionInner option={card.left} />
              </LinearGradient>
            </Animated.View>
          </Pressable>
          <Pressable style={styles.half} onPress={() => animatePick('right')}>
            <Animated.View style={[styles.cardWrap, rightStyle]}>
              <LinearGradient colors={card.gradientRight} style={styles.card}>
                <OptionInner option={card.right} />
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}

function OptionInner({ option }: { option: QuizOption }) {
  return (
    <>
      <Text style={styles.emoji}>{option.emoji}</Text>
      <Text style={styles.title}>{option.title}</Text>
      <Text style={styles.body}>{option.body}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    width: W,
    minHeight: H * 0.62,
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  half: {
    flex: 1,
  },
  cardWrap: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    minHeight: H * 0.52,
  },
  card: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emoji: {
    fontSize: 44,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  body: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
});
