import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, BRAND } from '../../config/theme';
import { CosmeticCard } from './CosmeticCard';
import type { Cosmetic, UserCosmetic, CharacterLoadout } from '../../types';
import type { CosmeticSlot } from '../../types/enums';

type Filter = 'all' | 'owned' | 'locked';

interface Props {
  allCosmetics: Cosmetic[];
  ownedCosmetics: UserCosmetic[];
  loadout: CharacterLoadout[];
  activeSlot: CosmeticSlot;
  onItemPress: (cosmetic: Cosmetic, isOwned: boolean) => void;
}

export function CosmeticGrid({
  allCosmetics,
  ownedCosmetics,
  loadout,
  activeSlot,
  onItemPress,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const ownedIds = useMemo(
    () => new Set(ownedCosmetics.map((uc) => uc.cosmetic_id)),
    [ownedCosmetics],
  );

  const equippedIds = useMemo(
    () => new Set(loadout.map((l) => l.cosmetic_id)),
    [loadout],
  );

  const slotItems = useMemo(() => {
    const items = allCosmetics.filter((c) => c.slot === activeSlot);
    switch (filter) {
      case 'owned':
        return items.filter((c) => ownedIds.has(c.id));
      case 'locked':
        return items.filter((c) => !ownedIds.has(c.id));
      default:
        // Sort owned first
        return items.sort((a, b) => {
          const aOwned = ownedIds.has(a.id) ? 0 : 1;
          const bOwned = ownedIds.has(b.id) ? 0 : 1;
          return aOwned - bOwned;
        });
    }
  }, [allCosmetics, activeSlot, filter, ownedIds]);

  const handleItemPress = useCallback(
    (cosmetic: Cosmetic) => {
      onItemPress(cosmetic, ownedIds.has(cosmetic.id));
    },
    [ownedIds, onItemPress],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Cosmetic; index: number }) => (
      <CosmeticCard
        cosmetic={item}
        isOwned={ownedIds.has(item.id)}
        isEquipped={equippedIds.has(item.id)}
        onPress={handleItemPress}
        index={index}
      />
    ),
    [ownedIds, equippedIds, handleItemPress],
  );

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'owned', label: '보유' },
    { key: 'locked', label: '미보유' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(key);
            }}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={slotItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎭</Text>
            <Text style={styles.emptyText}>
              {filter === 'owned' ? '보유 아이템이 없어요' : '아이템이 없어요'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
  },
  filterChipActive: {
    backgroundColor: BRAND.primary,
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: FONT_WEIGHT.bold,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  listContent: {
    paddingBottom: SPACING.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
});
