/**
 * MBTISelector — 16종 MBTI 그리드 선택기.
 *
 * 배치:
 *   1. 온보딩: personality-quiz 다음 단계 (선택 사항 · 건너뛰기 가능)
 *   2. 설정: 프로필 설정에서 언제든 변경/제거 가능 (동일 컴포넌트 재사용)
 *
 * 출력:
 *   - onSelect(code | null)
 *     - code: 16종 중 하나 (ENFP 등)
 *     - null: "잘 모르겠어요" / 해제 선택
 *   - onSkip(): 온보딩에서 "나중에 설정할래요"
 *
 * 🚨 규칙
 *   - 이 컴포넌트는 저장 책임이 없다. 부모가 onSelect로 받아서 updateProfile 호출.
 *   - "잘 모르겠어요" → 부모는 profiles.mbti = null 로 저장 or 그대로 skip.
 *   - 사용자가 AI와의 대화에서 MBTI를 언급해도 "내부 설정값"임을 다시 상기시키지 않는다.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MBTI_CODES_GRID } from '../../data/mbti-character-map';
import { MBTI_MODIFIERS } from '../../data/mbti-personality-modifiers';
import type { MBTICode } from '../../types/models';
import {
  BRAND,
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '../../config/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/** 그룹별 색상 그라데이션 — 4 행(분석가/외교관/관리자/탐험가) 순 */
const GROUP_GRADIENT: [string, string][] = [
  ['#4C1D95', '#7C3AED'],
  ['#065F46', '#10B981'],
  ['#1E3A5F', '#2563EB'],
  ['#B45309', '#F59E0B'],
];

type Props = {
  /** 현재 선택된 MBTI (설정 화면에서 활용) */
  initial?: MBTICode | null;
  /** 타이틀 / 서브타이틀 커스터마이징 */
  title?: string;
  subtitle?: string;
  /** 선택 확정 콜백. null이면 "잘 모르겠어요" (해제) */
  onSelect: (code: MBTICode | null) => void;
  /** 선택적 — "나중에 설정할래요". 제공되지 않으면 스킵 버튼 미표시. */
  onSkip?: () => void;
  /** 저장/네트워크 중 상태 */
  saving?: boolean;
};

export function MBTISelector({
  initial = null,
  title = '성격 유형을 알려주세요',
  subtitle = '같은 장소라도 당신에게 맞는 이야기를 들려드릴게요. (선택 사항)',
  onSelect,
  onSkip,
  saving = false,
}: Props) {
  const [selected, setSelected] = useState<MBTICode | null>(initial);

  const handlePick = useCallback((code: MBTICode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(code);
  }, []);

  const handleConfirm = useCallback(() => {
    if (saving || !selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(selected);
  }, [saving, selected, onSelect]);

  const handleClear = useCallback(() => {
    if (saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(null);
    onSelect(null);
  }, [saving, onSelect]);

  const label = useMemo(
    () => (selected ? MBTI_MODIFIERS[selected]?.label ?? '' : ''),
    [selected],
  );

  const cellWidth = useMemo(() => {
    const horizontalPadding = SPACING.lg * 2;
    const gaps = SPACING.sm * 3;
    return Math.floor((SCREEN_W - horizontalPadding - gaps) / 4);
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {MBTI_CODES_GRID.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={styles.row}>
              {row.map((code) => {
                const mod = MBTI_MODIFIERS[code];
                const isSelected = selected === code;
                const gradient = GROUP_GRADIENT[rowIdx] ?? GROUP_GRADIENT[0];
                return (
                  <Pressable
                    key={code}
                    onPress={() => handlePick(code)}
                    style={[styles.cell, { width: cellWidth }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${code} · ${mod?.label ?? ''}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? gradient
                          : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']
                      }
                      style={[
                        styles.cellInner,
                        isSelected && styles.cellInnerSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellCode,
                          isSelected && styles.cellCodeSelected,
                        ]}
                      >
                        {code}
                      </Text>
                      <Text
                        style={[
                          styles.cellLabel,
                          isSelected && styles.cellLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {mod?.label ?? ''}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {selected && (
          <View style={styles.hintBox}>
            <Text style={styles.hintCode}>{selected}</Text>
            <Text style={styles.hintLabel}>{label}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.primaryBtn,
            (!selected || saving) && styles.primaryBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selected || saving}
          accessibilityRole="button"
          accessibilityLabel="선택한 성격 유형 저장"
        >
          <Text style={styles.primaryBtnText}>
            {saving ? '저장 중…' : '이 성격으로 설정'}
          </Text>
        </Pressable>

        <View style={styles.subRow}>
          <Pressable
            onPress={handleClear}
            style={styles.linkBtn}
            disabled={saving}
            accessibilityLabel="잘 모르겠어요"
          >
            <Text style={styles.linkText}>잘 모르겠어요</Text>
          </Pressable>
          {onSkip && (
            <>
              <Text style={styles.dotSep}>·</Text>
              <Pressable
                onPress={onSkip}
                style={styles.linkBtn}
                disabled={saving}
                accessibilityLabel="나중에 설정하기"
              >
                <Text style={styles.linkText}>나중에 할래요</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  grid: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  cell: {
    aspectRatio: 0.95,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  cellInner: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cellInnerSelected: {
    borderColor: '#FFFFFF',
  },
  cellCode: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  cellCodeSelected: {
    color: '#FFFFFF',
  },
  cellLabel: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  cellLabelSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  hintBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  hintCode: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.primary,
    letterSpacing: 1,
  },
  hintLabel: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  actions: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  linkBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  dotSep: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },
});
