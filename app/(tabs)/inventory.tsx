import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInventoryStore } from '../../src/stores/inventoryStore';
import { BadgeGridSkeleton, ItemListSkeleton } from '../../src/components/ui';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import type { UserBadge, Badge, InventoryItem } from '../../src/types';

type TabKey = 'badges' | 'items' | 'collection';

const RARITY_COLORS: Record<string, string> = {
  common: COLORS.common,
  rare: COLORS.rare,
  epic: COLORS.epic,
  legendary: COLORS.legendary,
};

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
};

const BADGE_EMOJIS: Record<string, string> = {
  exploration: '🗺️',
  region: '🎯',
  season: '🔥',
  achievement: '💎',
};

const ITEM_EMOJIS: Record<string, string> = {
  booster: '⚡',
  cosmetic: '🎭',
  coupon: '🎟️',
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('badges');
  const { userBadges, allBadges, items, fetchAll, isLoading } = useInventoryStore();

  useEffect(() => {
    fetchAll();
  }, []);

  const earnedBadgeIds = useMemo(
    () => new Set(userBadges.map((ub) => ub.badge_id)),
    [userBadges],
  );

  const lockedBadges = useMemo(
    () => allBadges.filter((b) => !earnedBadgeIds.has(b.id)),
    [allBadges, earnedBadgeIds],
  );

  const totalCollectibles = allBadges.length || 1;
  const collectedCount = userBadges.length + items.length;
  const collectionPercent = Math.round((collectedCount / totalCollectibles) * 100);

  const tabs: { key: TabKey; label: string; count: string }[] = [
    { key: 'badges', label: '배지', count: `${userBadges.length}/${allBadges.length}` },
    { key: 'items', label: '아이템', count: `${items.length}` },
    { key: 'collection', label: '도감', count: `${collectionPercent}%` },
  ];

  const [refreshing, setRefreshing] = useState(false);
  const showBadgeSkeleton = isLoading && userBadges.length === 0 && allBadges.length === 0;
  const showItemSkeleton = isLoading && items.length === 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>가방</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.key);
            }}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            <Text style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
              {tab.count}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {activeTab === 'badges' && showBadgeSkeleton && (
          <View style={{ paddingVertical: SPACING.lg }}>
            <BadgeGridSkeleton count={6} />
          </View>
        )}
        {activeTab === 'badges' && !showBadgeSkeleton && (
          <Animated.View entering={FadeIn} style={styles.badgeGrid}>
            {userBadges.map((ub, i) => {
              const badge = ub.badges;
              const rarity = badge?.rarity ?? 'common';
              const category = badge?.category ?? 'exploration';
              return (
                <Animated.View key={ub.id} entering={FadeIn.delay(i * 60)} style={styles.badgeCardWrapper}>
                  <View style={[styles.badgeCard, { borderColor: RARITY_COLORS[rarity] }]}>
                    <Text style={styles.badgeEmoji}>{BADGE_EMOJIS[category] ?? '🏅'}</Text>
                    <Text style={styles.badgeName} numberOfLines={1}>{badge?.name ?? '배지'}</Text>
                    <Text style={[styles.badgeRarity, { color: RARITY_COLORS[rarity] }]}>
                      {RARITY_LABELS[rarity]}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
            {lockedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCardWrapper}>
                <View style={[styles.badgeCard, styles.badgeCardLocked]}>
                  <Text style={styles.badgeLockedIcon}>?</Text>
                  <Text style={styles.badgeLockedName} numberOfLines={1}>{badge.name}</Text>
                  <Text style={styles.badgeLockedRarity}>{RARITY_LABELS[badge.rarity]}</Text>
                </View>
              </View>
            ))}
            {userBadges.length === 0 && lockedBadges.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏅</Text>
                <Text style={styles.emptyText}>아직 배지가 없습니다</Text>
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'items' && showItemSkeleton && (
          <View style={{ paddingVertical: SPACING.lg }}>
            <ItemListSkeleton count={4} />
          </View>
        )}
        {activeTab === 'items' && !showItemSkeleton && (
          <Animated.View entering={FadeIn} style={styles.itemList}>
            {items.map((item, i) => (
              <Animated.View key={item.id} entering={FadeIn.delay(i * 80)}>
                <View style={[styles.itemCard, { borderColor: RARITY_COLORS[item.rarity] + '60' }]}>
                  <View style={[styles.itemIconCircle, { backgroundColor: RARITY_COLORS[item.rarity] + '20' }]}>
                    <Text style={styles.itemEmoji}>{ITEM_EMOJIS[item.item_type] ?? '📦'}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.item_name}</Text>
                      <Text style={[styles.itemRarity, { color: RARITY_COLORS[item.rarity] }]}>
                        {RARITY_LABELS[item.rarity]}
                      </Text>
                    </View>
                    {item.quantity > 1 && (
                      <Text style={styles.itemQty}>x{item.quantity}</Text>
                    )}
                  </View>
                  {item.item_type === 'booster' && (
                    <Pressable
                      style={styles.useBtn}
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                    >
                      <Text style={styles.useBtnText}>사용</Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            ))}
            {items.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎒</Text>
                <Text style={styles.emptyText}>아직 아이템이 없습니다</Text>
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'collection' && (
          <Animated.View entering={FadeIn}>
            {/* Progress */}
            <View style={styles.collectionProgress}>
              <View style={styles.collectionProgressHeader}>
                <Text style={styles.collectionProgressTitle}>수집 진행률</Text>
                <Text style={styles.collectionProgressValue}>
                  {collectedCount}/{totalCollectibles} ({collectionPercent}%)
                </Text>
              </View>
              <View style={styles.collectionBar}>
                <View style={[styles.collectionBarFill, { width: `${collectionPercent}%` }]} />
              </View>
            </View>

            {/* Categories */}
            {(['exploration', 'region', 'season', 'achievement'] as const).map((cat) => {
              const catBadges = allBadges.filter((b) => b.category === cat);
              const earned = catBadges.filter((b) => earnedBadgeIds.has(b.id)).length;
              const catLabels: Record<string, string> = {
                exploration: '🗺️ 탐험 배지',
                region: '🎯 지역 배지',
                season: '🔥 시즌 배지',
                achievement: '💎 업적 배지',
              };
              return (
                <View key={cat} style={styles.collectionCategory}>
                  <View style={styles.collectionCatHeader}>
                    <Text style={styles.collectionCatTitle}>{catLabels[cat]}</Text>
                    <Text style={styles.collectionCatCount}>{earned}/{catBadges.length}</Text>
                  </View>
                  <View style={styles.collectionCatGrid}>
                    {catBadges.map((badge) => (
                      <View
                        key={badge.id}
                        style={[
                          styles.collectionDot,
                          earnedBadgeIds.has(badge.id)
                            ? { backgroundColor: RARITY_COLORS[badge.rarity] }
                            : { backgroundColor: COLORS.surfaceHighlight },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', paddingHorizontal: SPACING.xl,
    gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.textPrimary },
  tabCount: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  tabCountActive: { color: COLORS.textPrimary },

  content: { flex: 1, paddingHorizontal: SPACING.xl },

  // ── Badges ──
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  badgeCardWrapper: { width: '47%' },
  badgeCard: {
    alignItems: 'center', padding: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  badgeCardLocked: {
    borderColor: COLORS.surfaceHighlight, opacity: 0.5,
  },
  badgeEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  badgeName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary, textAlign: 'center' },
  badgeRarity: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 4 },
  badgeLockedIcon: { fontSize: 36, marginBottom: SPACING.sm, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.bold },
  badgeLockedName: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
  badgeLockedRarity: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4 },

  // ── Items ──
  itemList: { gap: SPACING.md },
  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, gap: SPACING.md,
    borderWidth: 1,
  },
  itemIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  itemEmoji: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  itemRarity: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  itemQty: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },
  useBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  useBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  // ── Empty ──
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },

  // ── Collection ──
  collectionProgress: { marginBottom: SPACING.xl },
  collectionProgressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  collectionProgressTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  collectionProgressValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  collectionBar: {
    height: 10, borderRadius: 5,
    backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden',
  },
  collectionBarFill: {
    height: '100%', borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  collectionCategory: {
    marginBottom: SPACING.xl,
  },
  collectionCatHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  collectionCatTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  collectionCatCount: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  collectionCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  collectionDot: {
    width: 28, height: 28, borderRadius: 14,
  },
});
