import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { PersonalityResult } from '../../data/personality-quiz';
import { KEYWORD_BADGE } from '../../data/personality-quiz';
import type { PersonalityKeyword } from '../../data/personality-quiz';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { shareKakaoText } from '../../services/kakaoShare';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - SPACING.lg * 2, 360);

const RESULT_GRADIENT: Record<string, [string, string]> = {
  explorer: ['#065F46', '#059669'],
  foodie: ['#1E3A5F', '#2563EB'],
  artist: ['#78350F', '#D97706'],
  socialite: ['#5B21B6', '#7C3AED'],
};

interface ParticleSpec {
  key: string;
  left: `${number}%`;
  top: `${number}%`;
  delay: number;
  size: number;
}

function useParticles(count: number): ParticleSpec[] {
  return useMemo(() => {
    const out: ParticleSpec[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        key: `p-${i}`,
        left: `${8 + ((i * 37) % 84)}%`,
        top: `${10 + ((i * 53) % 80)}%`,
        delay: (i % 5) * 120,
        size: 4 + (i % 4),
      });
    }
    return out;
  }, [count]);
}

function Particle({ spec }: { spec: ParticleSpec }) {
  const o = useSharedValue(0.15);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900 + spec.delay }),
        withTiming(0.2, { duration: 900 + spec.delay }),
      ),
      -1,
      true,
    );
  }, [o, spec.delay]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: spec.left,
          top: spec.top,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: 'rgba(255,255,255,0.85)',
        },
        style,
      ]}
    />
  );
}

interface Props {
  result: PersonalityResult;
  onStartWithRecommended: () => void;
  onPickOtherCharacter: () => void;
}

export function QuizResultCard({
  result,
  onStartWithRecommended,
  onPickOtherCharacter,
}: Props) {
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const particles = useParticles(22);
  const g = RESULT_GRADIENT[result.recommended_character_type] ?? ['#0F172A', '#334155'];

  const badgeLine = useMemo(() => {
    return (result.keywords as PersonalityKeyword[])
      .map((k) => {
        const b = KEYWORD_BADGE[k];
        return b ? `${b.emoji} ${b.label}` : k;
      })
      .join(' · ');
  }, [result.keywords]);

  const handleShareImage = useCallback(async () => {
    try {
      setSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!shotRef.current?.capture) return;
      const uri = await shotRef.current.capture();
      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        Alert.alert('알림', '이 기기에서는 공유를 사용할 수 없습니다.');
        return;
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: '탐험가 성격 결과 공유',
        mimeType: 'image/png',
      });
    } catch {
      Alert.alert('오류', '이미지 공유에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  }, []);

  const handleKakao = useCallback(async () => {
    try {
      setSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const text = [
        'WhereHere 탐험가 성격',
        '',
        `나는 「${result.type_name}」`,
        badgeLine,
        '',
        `추천 동반자: ${result.recommendedEmoji} ${result.recommendedKoreanName}`,
        '',
        '앱에서 나만의 탐험을 시작해 보세요.',
      ].join('\n');
      await shareKakaoText({
        text,
        buttonTitle: 'WhereHere 열기',
        linkParams: {
          iosExecutionParams: { screen: 'welcome' },
          androidExecutionParams: { screen: 'welcome' },
        },
      });
    } catch {
      await handleShareImage();
    } finally {
      setSharing(false);
    }
  }, [badgeLine, handleShareImage, result]);

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.particleLayer}>
        {particles.map((p) => (
          <Particle key={p.key} spec={p} />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(80)} style={styles.content}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95 }} style={styles.shot}>
          <LinearGradient colors={g} style={[styles.card, { width: CARD_W }]}>
            <Text style={styles.brand}>WhereHere</Text>
            <Text style={styles.head}>당신은</Text>
            <Text style={styles.typeName}>「{result.type_name}」</Text>
            <Text style={styles.badgeLine} numberOfLines={3}>
              {badgeLine}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.recLabel}>추천 캐릭터</Text>
            <Text style={styles.recLine}>
              {result.recommendedEmoji} {result.recommendedKoreanName}이 당신의 완벽한 동반자예요
            </Text>
            <Text style={styles.blurb}>{result.blurb}</Text>
          </LinearGradient>
        </ViewShot>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: BRAND.primary }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onStartWithRecommended();
          }}
        >
          <Text style={styles.primaryBtnText}>이 캐릭터로 시작하기</Text>
        </Pressable>

        <Pressable onPress={onPickOtherCharacter} style={styles.linkBtn}>
          <Text style={styles.linkText}>다른 캐릭터 보기</Text>
        </Pressable>

        <View style={styles.shareRow}>
          <Pressable
            style={styles.shareBtn}
            onPress={handleShareImage}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.shareBtnText}>이미지 공유</Text>
            )}
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={handleKakao} disabled={sharing}>
            <Text style={styles.shareBtnText}>카카오로 공유</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  shot: {
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
  },
  card: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  brand: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.sm,
  },
  head: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255,255,255,0.9)',
  },
  typeName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  badgeLine: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: SPACING.lg,
  },
  recLabel: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.xs,
  },
  recLine: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  blurb: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.9)',
  },
  primaryBtn: {
    width: CARD_W,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  primaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  linkBtn: {
    paddingVertical: SPACING.sm,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  shareRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  shareBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 120,
    alignItems: 'center',
  },
  shareBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
