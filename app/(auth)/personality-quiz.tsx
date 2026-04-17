import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPersonalityQuizCards,
  buildPersonalityResult,
  resultToExplorerPayload,
  type PersonalityKeyword,
  type PersonalityResult,
} from '../../src/data/personality-quiz';
import { PersonalityCard } from '../../src/components/onboarding/PersonalityCard';
import { QuizResultCard } from '../../src/components/onboarding/QuizResultCard';
import { updateProfile } from '../../src/lib/api';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../src/config/theme';

export default function PersonalityQuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cards = useMemo(() => getPersonalityQuizCards(), []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PersonalityKeyword[]>([]);
  const [phase, setPhase] = useState<'quiz' | 'result' | 'saving'>('quiz');
  const [result, setResult] = useState<PersonalityResult | null>(null);

  const persistAndShowResult = useCallback(
    async (keywords: PersonalityKeyword[]) => {
      const built = buildPersonalityResult(keywords);
      setPhase('saving');
      try {
        await updateProfile({ explorer_type: resultToExplorerPayload(built) });
      } catch {
        Alert.alert(
          '저장 알림',
          '진단 결과를 서버에 저장하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요. 계속 진행할 수 있어요.',
        );
      }
      setResult(built);
      setPhase('result');
    },
    [],
  );

  const onPick = useCallback(
    (keyword: PersonalityKeyword) => {
      const next = [...answers, keyword];
      setAnswers(next);
      if (next.length >= cards.length) {
        void persistAndShowResult(next);
        return;
      }
      setIndex((i) => i + 1);
    },
    [answers, cards.length, persistAndShowResult],
  );

  const goRecommended = useCallback(() => {
    if (!result) return;
    // personality-quiz → mbti-select → onboarding 순서.
    // 추천 캐릭터 타입은 onboarding까지 이어서 전달된다.
    router.replace({
      pathname: '/(auth)/mbti-select',
      params: { recommended: result.recommended_character_type },
    } as Href);
  }, [result, router]);

  const goOther = useCallback(() => {
    router.replace('/(auth)/mbti-select' as Href);
  }, [router]);

  const bgGradient: [string, string] = useMemo(() => {
    if (phase !== 'quiz' || !cards[index]) return ['#0F172A', '#1E293B'];
    const c = cards[index];
    return [c.gradientLeft[0], c.gradientRight[1]];
  }, [cards, index, phase]);

  return (
    <LinearGradient colors={bgGradient} style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={[styles.header, { paddingHorizontal: SPACING.lg }]}>
        {phase === 'quiz' ? (
          <View style={styles.dotsRow}>
            {cards.map((c, i) => (
              <View
                key={c.id}
                style={[styles.dot, i === index && styles.dotOn, i < index && styles.dotDone]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {phase === 'quiz' && cards[index] && (
        <View style={styles.quizBody}>
          <Text style={styles.stepTitle}>탐험가 성격 진단</Text>
          <Text style={styles.stepSub}>
            {index + 1} / {cards.length}
          </Text>
          <PersonalityCard card={cards[index]} onPick={onPick} />
        </View>
      )}

      {phase === 'saving' && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.savingText}>결과를 정리하는 중…</Text>
        </View>
      )}

      {phase === 'result' && result && (
        <QuizResultCard
          result={result}
          onStartWithRecommended={goRecommended}
          onPickOtherCharacter={goOther}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerSpacer: {
    height: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotOn: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
  dotDone: {
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  quizBody: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  stepTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stepSub: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  savingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.md,
  },
});
