import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCharacterStore } from '../../src/stores/characterStore';
import { getAllCosmetics, getMyCosmetics, getFriends, giftCosmetic, sendPushToUser } from '../../src/lib/api';
import type { Cosmetic } from '../../src/types';
import type { CosmeticSlot } from '../../src/types/enums';
import { RARITY_COLORS, RARITY_LABELS, SLOT_CONFIG } from '../../src/components/cosmetic/constants';
import {
  COLORS, SPACING, FONT_SIZE, FONT_WEIGHT,
  BORDER_RADIUS, BRAND,
} from '../../src/config/theme';

type TabKey = 'recommend' | 'new' | 'limited';
type SlotFilter = 'all' | CosmeticSlot;

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ giftTo?: string; giftToName?: string }>();
  const { coins, fetchCoins, purchaseItem } = useCharacterStore();

  const [allCosmetics, setAllCosmetics] = useState<Cosmetic[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('recommend');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [giftFriendModalVisible, setGiftFriendModalVisible] = useState(false);
  const [giftFriendsLoading, setGiftFriendsLoading] = useState(false);
  const [giftFriends, setGiftFriends] = useState<{ user_id: string; username: string }[]>([]);
  const [pendingGiftCosmetic, setPendingGiftCosmetic] = useState<Cosmetic | null>(null);
  const [giftingId, setGiftingId] = useState<string | null>(null);

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
      setOwnedIds(new Set(owned.map((o) => o.cosmetic_id)));
      await fetchCoins();
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  };

  const purchasableItems = useMemo(() => {
    const items = allCosmetics.filter(
      (c) => c.unlock_method === 'purchase' && c.coin_price > 0,
    );

    // Slot filter
    const filtered = slotFilter === 'all'
      ? items
      : items.filter((c) => c.slot === slotFilter);

    // Tab filter
    switch (activeTab) {
      case 'new':
        return [...filtered].sort(
          (a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime(),
        );
      case 'limited':
        return filtered.filter((c) => c.is_limited);
      case 'recommend':
      default:
        return filtered.sort((a, b) => {
          const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
          return (rarityOrder[a.rarity] ?? 4) - (rarityOrder[b.rarity] ?? 4);
        });
    }
  }, [allCosmetics, activeTab, slotFilter]);

  const openGiftFriendPicker = useCallback(async (cosmetic: Cosmetic) => {
    setPendingGiftCosmetic(cosmetic);
    const fixedReceiver = typeof params.giftTo === 'string' ? params.giftTo : undefined;
    const fixedName = typeof params.giftToName === 'string' ? params.giftToName : '친구';
    if (fixedReceiver) {
      Alert.alert(
        '선물 확인',
        `${fixedName}님에게 [${cosmetic.name}]을(를) 선물하시겠습니까? (${cosmetic.coin_price} 코인)`,
        [
          { text: '취소', style: 'cancel', onPress: () => setPendingGiftCosmetic(null) },
          {
            text: '선물하기',
            onPress: async () => {
              setGiftingId(cosmetic.id);
              try {
                const result = await giftCosmetic(fixedReceiver, cosmetic.id);
                if (result.success) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  useCharacterStore.setState({ coins: result.remaining_coins });
                  await sendPushToUser(
                    fixedReceiver,
                    '선물 도착',
                    `🎁 ${result.sender_username}님이 [${result.cosmetic_name}]을(를) 선물했어요!`,
                  );
                  Alert.alert('선물 완료', `${fixedName}님에게 전달했어요!`);
                  void fetchCoins();
                } else {
                  const msg: Record<string, string> = {
                    insufficient_coins: '코인이 부족해요.',
                    not_friends: '친구에게만 선물할 수 있어요.',
                    already_owned: '상대가 이미 보유한 아이템이에요.',
                    receiver_level_too_low: '상대 캐릭터 레벨이 부족해요.',
                    receiver_class_mismatch: '상대 캐릭터 타입에 맞지 않는 아이템이에요.',
                    receiver_not_premium: '상대는 프리미엄 회원이 아니에요.',
                    not_giftable: '선물할 수 없는 아이템이에요.',
                  };
                  Alert.alert('선물 실패', msg[result.error] ?? '다시 시도해 주세요.');
                }
              } finally {
                setGiftingId(null);
                setPendingGiftCosmetic(null);
              }
            },
          },
        ],
      );
      return;
    }

    setGiftFriendModalVisible(true);
    setGiftFriendsLoading(true);
    try {
      const res = await getFriends();
      setGiftFriends(res.friends.map((f) => ({ user_id: f.user_id, username: f.username })));
    } catch {
      setGiftFriends([]);
    } finally {
      setGiftFriendsLoading(false);
    }
  }, [params.giftTo, params.giftToName, fetchCoins]);

  const confirmGiftToFriend = useCallback(
    async (cosmetic: Cosmetic, receiverId: string, receiverName: string) => {
      setGiftFriendModalVisible(false);
      setGiftingId(cosmetic.id);
      try {
        const result = await giftCosmetic(receiverId, cosmetic.id);
        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          useCharacterStore.setState({ coins: result.remaining_coins });
          await sendPushToUser(
            receiverId,
            '선물 도착',
            `🎁 ${result.sender_username}님이 [${result.cosmetic_name}]을(를) 선물했어요!`,
          );
          Alert.alert('선물 완료', `${receiverName}님에게 전달했어요!`);
          void fetchCoins();
        } else {
          const msg: Record<string, string> = {
            insufficient_coins: '코인이 부족해요.',
            not_friends: '친구에게만 선물할 수 있어요.',
            already_owned: '상대가 이미 보유한 아이템이에요.',
            receiver_level_too_low: '상대 캐릭터 레벨이 부족해요.',
            receiver_class_mismatch: '상대 캐릭터 타입에 맞지 않는 아이템이에요.',
            receiver_not_premium: '상대는 프리미엄 회원이 아니에요.',
            not_giftable: '선물할 수 없는 아이템이에요.',
          };
          Alert.alert('선물 실패', msg[result.error] ?? '다시 시도해 주세요.');
        }
      } finally {
        setGiftingId(null);
        setPendingGiftCosmetic(null);
      }
    },
    [fetchCoins],
  );

  const handlePurchase = useCallback(async (cosmetic: Cosmetic) => {
    if (ownedIds.has(cosmetic.id)) {
      Alert.alert('이미 보유', '이미 보유한 아이템이에요!');
      return;
    }

    if (coins < cosmetic.coin_price) {
      Alert.alert('코인 부족', '코인이 부족해요.', [
        { text: '확인', style: 'cancel' },
        { text: '코인 충전하기', onPress: () => router.push('/premium') },
      ]);
      return;
    }

    Alert.alert(
      '구매 확인',
      `${cosmetic.name}을(를) ${cosmetic.coin_price} 코인에 구매하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매하기',
          onPress: async () => {
            setPurchasingId(cosmetic.id);
            const result = await purchaseItem(cosmetic.id);
            setPurchasingId(null);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setOwnedIds((prev) => new Set([...prev, cosmetic.id]));
              Alert.alert('구매 완료!', '인벤토리에 추가되었어요!');
            } else {
              Alert.alert('구매 실패', result.error ?? '다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }, [coins, ownedIds, purchaseItem, router]);

  const renderItem = useCallback(({ item, index }: { item: Cosmetic; index: number }) => {
    const rarityColor = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common;
    const owned = ownedIds.has(item.id);
    const isPurchasing = purchasingId === item.id;

    return (
      <Animated.View entering={FadeIn.delay(index * 40)} style={styles.cardWrapper}>
        <View style={[styles.card, { borderColor: rarityColor }]}>
          <Pressable style={styles.cardMainTap} onPress={() => handlePurchase(item)}>
            <Text style={styles.cardEmoji}>{item.preview_emoji}</Text>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.effect_description && (
              <Text style={styles.cardEffect} numberOfLines={1}>{item.effect_description}</Text>
            )}
            <Text style={[styles.cardRarity, { color: rarityColor }]}>
              {RARITY_LABELS[item.rarity]}
            </Text>

            {owned ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>보유중</Text>
              </View>
            ) : isPurchasing ? (
              <ActivityIndicator size="small" color={BRAND.gold} style={{ marginTop: SPACING.sm }} />
            ) : (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>🪙 {item.coin_price}</Text>
              </View>
            )}
          </Pressable>

          {!owned && !isPurchasing && (
            <Pressable
              style={styles.giftBtn}
              disabled={giftingId === item.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void openGiftFriendPicker(item);
              }}
            >
              {giftingId === item.id ? (
                <ActivityIndicator size="small" color={BRAND.primary} />
              ) : (
                <Text style={styles.giftBtnText}>🎁 선물하기</Text>
              )}
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }, [ownedIds, purchasingId, handlePurchase, openGiftFriendPicker, giftingId]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'recommend', label: '추천' },
    { key: 'new', label: '신규' },
    { key: 'limited', label: '한정' },
  ];

  const SLOT_FILTERS: { key: SlotFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    ...SLOT_CONFIG.map((s) => ({ key: s.key as SlotFilter, label: `${s.emoji} ${s.label}` })),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>상점</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🪙 {coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(key);
            }}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Slot filter */}
      <FlatList
        data={SLOT_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.slotFilterRow}
        renderItem={({ item: { key, label } }) => (
          <Pressable
            style={[styles.slotChip, slotFilter === key && styles.slotChipActive]}
            onPress={() => setSlotFilter(key)}
          >
            <Text style={[styles.slotChipText, slotFilter === key && styles.slotChipTextActive]}>
              {label}
            </Text>
          </Pressable>
        )}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      ) : (
        <FlatList
          data={purchasableItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyText}>상점에 아이템이 없어요</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={giftFriendModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setGiftFriendModalVisible(false);
          setPendingGiftCosmetic(null);
        }}
      >
        <Pressable
          style={styles.giftModalOverlay}
          onPress={() => {
            setGiftFriendModalVisible(false);
            setPendingGiftCosmetic(null);
          }}
        >
          <Pressable style={[styles.giftSheet, { paddingBottom: insets.bottom + SPACING.lg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.giftSheetTitle}>선물할 친구 선택</Text>
            {pendingGiftCosmetic ? (
              <Text style={styles.giftSheetSub} numberOfLines={2}>
                {pendingGiftCosmetic.preview_emoji} {pendingGiftCosmetic.name} · 🪙 {pendingGiftCosmetic.coin_price}
              </Text>
            ) : null}
            {giftFriendsLoading ? (
              <ActivityIndicator style={{ marginVertical: SPACING.xl }} color={BRAND.primary} />
            ) : giftFriends.length === 0 ? (
              <Text style={styles.giftEmpty}>친구를 추가한 뒤 선물할 수 있어요.</Text>
            ) : (
              <ScrollView style={styles.giftFriendList} keyboardShouldPersistTaps="handled">
                {giftFriends.map((f) => (
                  <Pressable
                    key={f.user_id}
                    style={styles.giftFriendRow}
                    onPress={() => {
                      if (!pendingGiftCosmetic) return;
                      Alert.alert(
                        '선물 확인',
                        `${f.username}님에게 [${pendingGiftCosmetic.name}]을(를) 선물하시겠습니까? (${pendingGiftCosmetic.coin_price} 코인)`,
                        [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '선물하기',
                            onPress: () =>
                              void confirmGiftToFriend(pendingGiftCosmetic, f.user_id, f.username),
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.giftFriendName}>{f.username}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable
              style={styles.giftCancelBtn}
              onPress={() => {
                setGiftFriendModalVisible(false);
                setPendingGiftCosmetic(null);
              }}
            >
              <Text style={styles.giftCancelText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  tabActive: { backgroundColor: BRAND.primary },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
  tabTextActive: { color: '#FFF', fontWeight: FONT_WEIGHT.bold },
  slotFilterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  slotChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
  },
  slotChipActive: { backgroundColor: `${BRAND.primary}25`, borderWidth: 1, borderColor: BRAND.primary },
  slotChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  slotChipTextActive: { color: BRAND.primary, fontWeight: FONT_WEIGHT.bold },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: SPACING.lg },
  gridContent: { paddingBottom: SPACING.xxxl },
  cardWrapper: { width: '48%', marginBottom: SPACING.md },
  card: {
    alignItems: 'stretch',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    minHeight: 150,
  },
  cardMainTap: { alignItems: 'center' },
  giftBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${BRAND.primary}18`,
    borderWidth: 1,
    borderColor: `${BRAND.primary}40`,
    alignItems: 'center',
  },
  giftBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: BRAND.primary },
  giftModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  giftSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '70%',
  },
  giftSheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  giftSheetSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
  giftFriendList: { maxHeight: 320, marginTop: SPACING.lg },
  giftFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  giftFriendName: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semibold },
  giftEmpty: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SPACING.xl },
  giftCancelBtn: { marginTop: SPACING.lg, alignItems: 'center', padding: SPACING.md },
  giftCancelText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  cardEmoji: { fontSize: 36, marginBottom: SPACING.xs },
  cardName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  cardEffect: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  cardRarity: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },
  priceBadge: {
    backgroundColor: `${BRAND.gold}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  priceText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.gold },
  ownedBadge: {
    backgroundColor: `${BRAND.primary}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  ownedText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.primary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
});
