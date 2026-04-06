import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCharacterStore } from '../src/stores/characterStore';
import { getAllTitles, getMyTitles, setActiveTitle } from '../src/lib/api';
import type { CharacterTitle, UserTitle } from '../src/types';
import { RARITY_COLORS, RARITY_LABELS } from '../src/components/cosmetic/constants';
import {
  COLORS, SPACING, FONT_SIZE, FONT_WEIGHT,
  BORDER_RADIUS, BRAND,
} from '../src/config/theme';

interface TitleDisplay {
  title: CharacterTitle;
  earned: boolean;
  isActive: boolean;
}

export default function TitlesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTitle } = useCharacterStore();

  const [allTitles, setAllTitles] = useState<CharacterTitle[]>([]);
  const [myTitleIds, setMyTitleIds] = useState<Set<string>>(new Set());
  const [currentActiveId, setCurrentActiveId] = useState<string | null>(activeTitle);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingTitle, setIsSettingTitle] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [titles, myTitles] = await Promise.all([
        getAllTitles(),
        getMyTitles(),
      ]);
      setAllTitles(titles);
      setMyTitleIds(new Set(myTitles.map((t) => t.title_id)));
    } catch {
      // Keep empty
    } finally {
      setIsLoading(false);
    }
  };

  const titleList = useMemo<TitleDisplay[]>(() => {
    // Earned first, then locked
    const earned = allTitles
      .filter((t) => myTitleIds.has(t.id))
      .map((t) => ({ title: t, earned: true, isActive: t.id === currentActiveId }));
    const locked = allTitles
      .filter((t) => !myTitleIds.has(t.id))
      .map((t) => ({ title: t, earned: false, isActive: false }));
    return [...earned, ...locked];
  }, [allTitles, myTitleIds, currentActiveId]);

  const handleTitlePress = useCallback(async (item: TitleDisplay) => {
    if (!item.earned) return; // Can't select locked

    if (item.isActive) {
      // Remove active title
      Alert.alert('칭호 해제', '현재 칭호를 해제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          onPress: async () => {
            setIsSettingTitle(true);
            try {
              await setActiveTitle(null);
              setCurrentActiveId(null);
              useCharacterStore.setState({ activeTitle: null });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              Alert.alert('오류', '칭호 해제에 실패했어요.');
            } finally {
              setIsSettingTitle(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert('칭호 변경', `"${item.title.name}" 칭호를 사용하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '사용하기',
        onPress: async () => {
          setIsSettingTitle(true);
          try {
            await setActiveTitle(item.title.id);
            setCurrentActiveId(item.title.id);
            useCharacterStore.setState({ activeTitle: item.title.name });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('오류', '칭호 변경에 실패했어요.');
          } finally {
            setIsSettingTitle(false);
          }
        },
      },
    ]);
  }, []);

  const renderTitle = useCallback(({ item, index }: { item: TitleDisplay; index: number }) => {
    const { title, earned, isActive } = item;
    const rarityColor = RARITY_COLORS[title.rarity] ?? RARITY_COLORS.common;
    const condition = formatCondition(title.unlock_condition);

    return (
      <Animated.View entering={FadeIn.delay(index * 50)}>
        <Pressable
          style={[
            styles.card,
            { borderColor: earned ? rarityColor : COLORS.surfaceHighlight },
            !earned && styles.cardLocked,
          ]}
          onPress={() => handleTitlePress(item)}
          disabled={isSettingTitle}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.cardIcon}>{title.icon_emoji}</Text>
          </View>
          <View style={styles.cardCenter}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardName, !earned && styles.cardNameLocked]} numberOfLines={1}>
                {title.name}
              </Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>사용 중</Text>
                </View>
              )}
            </View>
            {title.description && (
              <Text style={styles.cardDesc} numberOfLines={1}>{title.description}</Text>
            )}
            <Text style={[styles.cardRarity, { color: rarityColor }]}>
              {RARITY_LABELS[title.rarity]}
              {title.category ? ` · ${getCategoryLabel(title.category)}` : ''}
            </Text>
            {!earned && condition && (
              <View style={styles.conditionRow}>
                <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                <Text style={styles.conditionText}>{condition}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [handleTitlePress, isSettingTitle]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>칭호</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      ) : (
        <FlatList
          data={titleList}
          renderItem={renderTitle}
          keyExtractor={(item) => item.title.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏷️</Text>
              <Text style={styles.emptyText}>칭호가 아직 없어요</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    exploration: '탐험',
    district: '지역',
    social: '소셜',
    achievement: '업적',
    season: '시즌',
  };
  return labels[category] ?? category;
}

function formatCondition(condition: Record<string, unknown>): string | null {
  if (!condition || Object.keys(condition).length === 0) return null;
  const type = condition.type as string | undefined;
  const value = condition.value as number | undefined;
  const district = condition.district as string | undefined;

  switch (type) {
    case 'events_completed':
      return district
        ? `${district} 이벤트 ${value}회 완료`
        : `이벤트 ${value}회 완료`;
    case 'checkins':
      return `체크인 ${value}회`;
    case 'streak':
      return `${value}일 연속 출석`;
    case 'level':
      return `레벨 ${value} 달성`;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    gap: SPACING.md,
  },
  cardLocked: { opacity: 0.55 },
  cardLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 22 },
  cardCenter: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  cardNameLocked: { color: COLORS.textMuted },
  activeBadge: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  activeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  cardDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardRarity: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  conditionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
});
