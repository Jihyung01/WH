import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useInventoryStore } from '../../src/stores/inventoryStore';
import { ItemRarity } from '../../src/types/enums';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import type { Badge, InventoryItem } from '../../src/types';

type TabKey = 'badges' | 'items' | 'collection';

const RARITY_COLORS: Record<string, string> = {
  [ItemRarity.COMMON]: COLORS.common,
  [ItemRarity.UNCOMMON]: COLORS.uncommon,
  [ItemRarity.RARE]: COLORS.rare,
  [ItemRarity.EPIC]: COLORS.epic,
  [ItemRarity.LEGENDARY]: COLORS.legendary,
};

const RARITY_LABELS: Record<string, string> = {
  [ItemRarity.COMMON]: '일반',
  [ItemRarity.UNCOMMON]: '고급',
  [ItemRarity.RARE]: '희귀',
  [ItemRarity.EPIC]: '영웅',
  [ItemRarity.LEGENDARY]: '전설',
};

// Mock data for demo
const MOCK_BADGES: Badge[] = [
  { id: 'b1', name: '첫 발걸음', description: '첫 번째 체크인 완료', iconUrl: '', category: 'MISSION', rarity: ItemRarity.COMMON, requirement: { type: 'checkin', target: 1, district: null }, xpBonus: 10, unlockedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'b2', name: '홍대 탐험가', description: '홍대 지역 이벤트 3개 완료', iconUrl: '', category: 'DISTRICT', rarity: ItemRarity.RARE, requirement: { type: 'district', target: 3, district: null }, xpBonus: 50, unlockedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'b3', name: '퀴즈 마스터', description: '퀴즈 10개 연속 정답', iconUrl: '', category: 'MISSION', rarity: ItemRarity.EPIC, requirement: { type: 'quiz', target: 10, district: null }, xpBonus: 100, unlockedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'b4', name: '사진작가', description: '사진 미션 20개 완료', iconUrl: '', category: 'COLLECTION', rarity: ItemRarity.UNCOMMON, requirement: { type: 'photo', target: 20, district: null }, xpBonus: 30, unlockedAt: null },
  { id: 'b5', name: '7일 연속 탐험', description: '7일 연속 체크인', iconUrl: '', category: 'STREAK', rarity: ItemRarity.RARE, requirement: { type: 'streak', target: 7, district: null }, xpBonus: 70, unlockedAt: null },
  { id: 'b6', name: '전설의 발견자', description: '숨은 명소 10곳 발견', iconUrl: '', category: 'SPECIAL', rarity: ItemRarity.LEGENDARY, requirement: { type: 'hidden', target: 10, district: null }, xpBonus: 200, unlockedAt: null },
  { id: 'b7', name: '성수 마스터', description: '성수동 이벤트 전체 완료', iconUrl: '', category: 'DISTRICT', rarity: ItemRarity.EPIC, requirement: { type: 'district', target: 10, district: null }, xpBonus: 150, unlockedAt: null },
  { id: 'b8', name: '야간 탐험가', description: '밤 10시 이후 체크인 5회', iconUrl: '', category: 'SPECIAL', rarity: ItemRarity.UNCOMMON, requirement: { type: 'night', target: 5, district: null }, xpBonus: 40, unlockedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const MOCK_ITEMS: InventoryItem[] = [
  { id: 'i1', userId: '', itemId: 'skin1', name: '봄의 모자', description: '벚꽃 테마 캐릭터 모자', iconUrl: '', rarity: ItemRarity.RARE, category: 'COSMETIC', quantity: 1, isEquipped: false, metadata: {}, acquiredAt: new Date().toISOString(), expiresAt: null },
  { id: 'i2', userId: '', itemId: 'boost1', name: 'XP 부스터 (2배)', description: '30분간 XP 획득량 2배', iconUrl: '', rarity: ItemRarity.UNCOMMON, category: 'CONSUMABLE', quantity: 3, isEquipped: false, metadata: {}, acquiredAt: new Date().toISOString(), expiresAt: null },
  { id: 'i3', userId: '', itemId: 'ticket1', name: '프리미엄 이벤트 티켓', description: '특별 이벤트 참여 가능', iconUrl: '', rarity: ItemRarity.EPIC, category: 'CONSUMABLE', quantity: 1, isEquipped: false, metadata: {}, acquiredAt: new Date().toISOString(), expiresAt: null },
  { id: 'i4', userId: '', itemId: 'coupon1', name: '카페 할인 쿠폰', description: '제휴 카페 20% 할인', iconUrl: '', rarity: ItemRarity.COMMON, category: 'COUPON', quantity: 2, isEquipped: false, metadata: {}, acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000 * 14).toISOString() },
];

const BADGE_EMOJIS: Record<string, string> = {
  DISTRICT: '🗺️', MISSION: '🎯', STREAK: '🔥', COLLECTION: '📸', SPECIAL: '💎',
};

const ITEM_EMOJIS: Record<string, string> = {
  COSMETIC: '🎭', CONSUMABLE: '⚡', EQUIPMENT: '🛡️', COUPON: '🎟️',
};

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('badges');
  const { badges, items, setBadges, setItems } = useInventoryStore();

  useEffect(() => {
    if (badges.length === 0) setBadges(MOCK_BADGES);
    if (items.length === 0) setItems(MOCK_ITEMS);
  }, []);

  const earnedBadges = badges.filter((b) => b.unlockedAt);
  const lockedBadges = badges.filter((b) => !b.unlockedAt);
  const totalCollectibles = badges.length + 20; // pretend more exist
  const collectedCount = earnedBadges.length + items.length;
  const collectionPercent = Math.round((collectedCount / totalCollectibles) * 100);

  const tabs: { key: TabKey; label: string; count: string }[] = [
    { key: 'badges', label: '배지', count: `${earnedBadges.length}/${badges.length}` },
    { key: 'items', label: '아이템', count: `${items.length}` },
    { key: 'collection', label: '도감', count: `${collectionPercent}%` },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'badges' && (
          <Animated.View entering={FadeIn} style={styles.badgeGrid}>
            {earnedBadges.map((badge, i) => (
              <Animated.View key={badge.id} entering={FadeIn.delay(i * 60)} style={styles.badgeCardWrapper}>
                <View style={[styles.badgeCard, { borderColor: RARITY_COLORS[badge.rarity] }]}>
                  <Text style={styles.badgeEmoji}>{BADGE_EMOJIS[badge.category] ?? '🏅'}</Text>
                  <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                  <Text style={[styles.badgeRarity, { color: RARITY_COLORS[badge.rarity] }]}>
                    {RARITY_LABELS[badge.rarity]}
                  </Text>
                </View>
              </Animated.View>
            ))}
            {lockedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCardWrapper}>
                <View style={[styles.badgeCard, styles.badgeCardLocked]}>
                  <Text style={styles.badgeLockedIcon}>?</Text>
                  <Text style={styles.badgeLockedName} numberOfLines={1}>{badge.name}</Text>
                  <Text style={styles.badgeLockedRarity}>{RARITY_LABELS[badge.rarity]}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {activeTab === 'items' && (
          <Animated.View entering={FadeIn} style={styles.itemList}>
            {items.map((item, i) => (
              <Animated.View key={item.id} entering={FadeIn.delay(i * 80)}>
                <View style={[styles.itemCard, { borderColor: RARITY_COLORS[item.rarity] + '60' }]}>
                  <View style={[styles.itemIconCircle, { backgroundColor: RARITY_COLORS[item.rarity] + '20' }]}>
                    <Text style={styles.itemEmoji}>{ITEM_EMOJIS[item.category] ?? '📦'}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={[styles.itemRarity, { color: RARITY_COLORS[item.rarity] }]}>
                        {RARITY_LABELS[item.rarity]}
                      </Text>
                    </View>
                    <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                    {item.quantity > 1 && (
                      <Text style={styles.itemQty}>x{item.quantity}</Text>
                    )}
                  </View>
                  {item.category === 'CONSUMABLE' && (
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
            {(['DISTRICT', 'MISSION', 'STREAK', 'COLLECTION', 'SPECIAL'] as const).map((cat) => {
              const catBadges = badges.filter((b) => b.category === cat);
              const earned = catBadges.filter((b) => b.unlockedAt).length;
              const catLabels: Record<string, string> = {
                DISTRICT: '🗺️ 지역 배지', MISSION: '🎯 미션 배지',
                STREAK: '🔥 연속 배지', COLLECTION: '📸 수집 배지', SPECIAL: '💎 특별 배지',
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
                          badge.unlockedAt
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
  header: { paddingTop: 60, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
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
  itemDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
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
