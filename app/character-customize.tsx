import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCharacterStore,
  getEvolutionStage,
  getEvolutionEmoji,
  getLevelTitle,
} from '../src/stores/characterStore';
import { getAllCosmetics, getMyCosmetics } from '../src/lib/api';
import type { Cosmetic, UserCosmetic } from '../src/types';
import type { CosmeticSlot } from '../src/types/enums';
import {
  COLORS, SPACING, FONT_SIZE, FONT_WEIGHT,
  BORDER_RADIUS, SHADOWS, BRAND,
} from '../src/config/theme';

import { CharacterPreview } from '../src/components/cosmetic/CharacterPreview';
import { SlotTabBar } from '../src/components/cosmetic/SlotTabBar';
import { CosmeticGrid } from '../src/components/cosmetic/CosmeticGrid';
import { CosmeticDetailSheet } from '../src/components/cosmetic/CosmeticDetailSheet';

export default function CharacterCustomizeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    character, loadout, equippedEffects, coins, mood, activeTitle,
    fetchLoadout, fetchCoins, equipItem, unequipItem, purchaseItem,
  } = useCharacterStore();

  const [allCosmetics, setAllCosmetics] = useState<Cosmetic[]>([]);
  const [ownedCosmetics, setOwnedCosmetics] = useState<UserCosmetic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>('hat');
  const [selectedCosmetic, setSelectedCosmetic] = useState<Cosmetic | null>(null);
  const [selectedIsOwned, setSelectedIsOwned] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const characterType = character?.character_type ?? 'explorer';
  const level = character?.level ?? 1;
  const stage = getEvolutionStage(level);
  const emoji = getEvolutionEmoji(characterType, stage);
  const charName = character?.name ?? '도담';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cosmetics, owned] = await Promise.all([
        getAllCosmetics(),
        getMyCosmetics(),
      ]);
      setAllCosmetics(cosmetics);
      setOwnedCosmetics(owned);
      await Promise.all([fetchLoadout(), fetchCoins()]);
    } catch {
      // Keep existing state
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = useCallback((cosmetic: Cosmetic, isOwned: boolean) => {
    // If owned + equipped → unequip; if owned + not equipped → equip directly
    const isEquipped = loadout.some((l) => l.cosmetic_id === cosmetic.id);

    if (isOwned && isEquipped) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      unequipItem(cosmetic.slot as CosmeticSlot);
      return;
    }

    if (isOwned && !isEquipped) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      equipItem(cosmetic.id, cosmetic.slot as CosmeticSlot);
      return;
    }

    // Not owned → show detail sheet
    setSelectedCosmetic(cosmetic);
    setSelectedIsOwned(isOwned);
  }, [loadout, equipItem, unequipItem]);

  const handleEquip = useCallback(() => {
    if (!selectedCosmetic) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    equipItem(selectedCosmetic.id, selectedCosmetic.slot as CosmeticSlot);
    setSelectedCosmetic(null);
  }, [selectedCosmetic, equipItem]);

  const handleUnequip = useCallback(() => {
    if (!selectedCosmetic) return;
    unequipItem(selectedCosmetic.slot as CosmeticSlot);
    setSelectedCosmetic(null);
  }, [selectedCosmetic, unequipItem]);

  const handlePurchase = useCallback(async () => {
    if (!selectedCosmetic) return;
    const name = selectedCosmetic.name;
    const price = selectedCosmetic.coin_price;

    Alert.alert(
      '구매 확인',
      `${name}을(를) ${price} 코인에 구매하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매하기',
          onPress: async () => {
            setIsPurchasing(true);
            const result = await purchaseItem(selectedCosmetic.id);
            setIsPurchasing(false);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Refresh owned list
              const owned = await getMyCosmetics();
              setOwnedCosmetics(owned);
              setSelectedCosmetic(null);
            } else {
              Alert.alert('구매 실패', result.error ?? '다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }, [selectedCosmetic, purchaseItem]);

  const isEquippedSelected = selectedCosmetic
    ? loadout.some((l) => l.cosmetic_id === selectedCosmetic.id)
    : false;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header coins={coins} onBack={() => router.back()} onShop={() => router.push('/shop')} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header coins={coins} onBack={() => router.back()} onShop={() => router.push('/shop')} />

      <CharacterPreview
        emoji={emoji}
        name={charName}
        level={level}
        title={activeTitle}
        mood={mood}
        loadout={loadout}
        effects={equippedEffects}
      />

      <SlotTabBar activeSlot={activeSlot} onSlotChange={setActiveSlot} />

      <View style={styles.gridArea}>
        <CosmeticGrid
          allCosmetics={allCosmetics}
          ownedCosmetics={ownedCosmetics}
          loadout={loadout}
          activeSlot={activeSlot}
          onItemPress={handleItemPress}
        />
      </View>

      <CosmeticDetailSheet
        cosmetic={selectedCosmetic}
        isOwned={selectedIsOwned}
        isEquipped={isEquippedSelected}
        coins={coins}
        isPurchasing={isPurchasing}
        onClose={() => setSelectedCosmetic(null)}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onPurchase={handlePurchase}
        onNavigateShop={() => {
          setSelectedCosmetic(null);
          router.push('/premium');
        }}
      />
    </View>
  );
}

function Header({ coins, onBack, onShop }: { coins: number; onBack: () => void; onShop: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>꾸미기</Text>
      <View style={styles.headerRight}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🪙 {coins.toLocaleString()}</Text>
        </View>
        <Pressable onPress={onShop} hitSlop={8}>
          <Ionicons name="storefront-outline" size={22} color={COLORS.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  coinBadge: {
    backgroundColor: `${BRAND.gold}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  coinText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
  },
  gridArea: {
    flex: 1,
    marginTop: SPACING.md,
  },
});
