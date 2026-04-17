import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MBTISelector } from '../../src/components/onboarding/MBTISelector';
import { getMyProfile, updateProfile } from '../../src/lib/api';
import type { MBTICode } from '../../src/types/models';
import { SPACING } from '../../src/config/theme';

/**
 * MBTI 선택 화면 — 두 가지 모드로 작동한다:
 *
 *   1) 온보딩 모드 (기본): personality-quiz → mbti-select → onboarding 순서.
 *      - 선택/스킵/"잘 모르겠어요" 모두 onboarding으로 replace.
 *      - personality-quiz에서 추천된 character_type은 그대로 전달된다.
 *
 *   2) 설정 모드 (params.from === 'settings'): 프로필 설정에서 호출.
 *      - 저장 후 router.back() — 온보딩으로 튕기지 않는다.
 *      - 현재 설정된 MBTI를 initial 값으로 불러온다.
 */
export default function MBTISelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recommended?: string; from?: string }>();
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<MBTICode | null>(null);

  const isSettings = params.from === 'settings';

  // 설정 모드일 때만 현재 MBTI를 불러와 그리드에 반영.
  useEffect(() => {
    if (!isSettings) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!cancelled && p?.mbti) setInitial(p.mbti as MBTICode);
      } catch {
        // 실패해도 기본값(null)로 동작.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSettings]);

  const finish = useCallback(() => {
    if (isSettings) {
      router.back();
      return;
    }
    if (params.recommended) {
      router.replace({
        pathname: '/(auth)/onboarding',
        params: { recommended: params.recommended },
      } as Href);
    } else {
      router.replace('/(auth)/onboarding' as Href);
    }
  }, [isSettings, params.recommended, router]);

  const handleSelect = useCallback(
    async (code: MBTICode | null) => {
      setSaving(true);
      try {
        await updateProfile({ mbti: code });
      } catch {
        Alert.alert(
          '저장 알림',
          'MBTI 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
      } finally {
        setSaving(false);
        finish();
      }
    },
    [finish],
  );

  const handleSkip = useCallback(() => {
    finish();
  }, [finish]);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={[styles.root, { paddingTop: insets.top + SPACING.md }]}
    >
      <View style={styles.body}>
        <MBTISelector
          initial={initial}
          onSelect={handleSelect}
          onSkip={isSettings ? undefined : handleSkip}
          saving={saving}
          title={isSettings ? '성격 유형 변경' : '성격 유형을 알려주세요'}
          subtitle={
            isSettings
              ? '변경 즉시 AI 대화·서사 톤에 반영됩니다.'
              : '같은 장소라도 당신에게 맞는 이야기를 들려드릴게요. (선택 사항)'
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
