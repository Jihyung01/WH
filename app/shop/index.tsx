import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, Alert, Modal, ScrollView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useCharacterStore } from '../../src/stores/characterStore';
import { usePremiumStore } from '../../src/stores/premiumStore';
import { getAllCosmetics, getMyCosmetics, getFriends, giftCosmetic, sendPushToUser } from '../../src/lib/api';
import type { Cosmetic } from '../../src/types';
import type { CosmeticSlot } from '../../src/types/enums';
import type { CoinProduct } from '../../src/lib/api';
import { RARITY_COLORS, RARITY_LABELS, SLOT_CONFIG } from '../../src/components/cosmetic/constants';
import {
  COLORS, SPACING, FONT_SIZE, FONT_WEIGHT,
  BORDER_RADIUS, BRAND, SHADOWS,
} from '../../src/config/theme';

type MainTab = 'cosmetics' | 'coins';
type CosmeticTab = 'recommend' | 'new' | 'limited';
type SlotFilter = 'all' | CosmeticSlot;

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ giftTo?: string; giftToName?: string; tab?: string }>();
  const { coins, fetchCoins, purchaseItem } = useCharacterStore();

  const {
    coinProducts, coinProductsLoaded, loadCoinProducts,
    offerings, loadOfferings, purchaseCoins: purchaseCoinsPkg,
    isLoading: premiumLoading,
  } = usePremiumStore();

  const [mainTab, setMainTab] = useState<MainTab>(
    params.tab === 'coins' ? 'coins' : 'cosmetics',
  );
  const [allCosmetics, setAllCosmetics] = useState<Cosmetic[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [cosmeticTab, setCosmeticTab] = useState<CosmeticTab>('recommend');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [giftFriendModalVisible, setGiftFriendModalVisible] = useState(false);
  const [giftFriendsLoading, setGiftFriendsLoading] = useState(false);
  const [giftFriends, setGiftFriends] = useState<{ user_id: string; username: string }[]>([]);
  const [pendingGiftCosmetic, setPendingGiftCosmetic] = useState<Cosmetic | null>(null);
  const [giftingId, setGiftingId] = useState<string | null>(null);
  const [purchasingCoinId, setPurchasingCoinId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    void loadCoinProducts();
    void loadOfferings();
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
    const filtered = slotFilter === 'all'
      ? items
      : items.filter((c) => c.slot === slotFilter);

    switch (cosmeticTab) {
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
  }, [allCosmetics, cosmeticTab, slotFilter]);

  // ── Coin Purchase ──
  const handleCoinPurchase = useCallback(async (product: CoinProduct) => {
    if (!offerings.length) {
      Alert.alert('안내', 'RevenueCat 상품이 아직 로드되지 않았어요.\n잠시 후 다시 시도해 주세요.');
      return;
    }

    const pkg = (offerings as { identifier?: string }[]).find(
      (o) => o.identifier === product.id,
    ) ?? offerings[0];

    if (!pkg) {
      Alert.alert('오류', '상품 정보를 찾을 수 없습니다.');
      return;
    }

    setPurchasingCoinId(product.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await purchaseCoinsPkg(pkg, product.id);

    setPurchasingCoinId(null);

    if (result.success && result.coinsGranted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useCharacterStore.setState({ coins: result.totalCoins ?? coins + result.coinsGranted });
      Alert.alert(
        '충전 완료!',
        `🪙 ${result.coinsGranted.toLocaleString()} 코인이 충전되었어요!`,
      );
    } else if (result.error && result.error !== 'cancelled' && result.error !== 'not_configured') {
      Alert.alert('오류', '결제 처리 중 문제가 발생했습니다.');
    }
  }, [offerings, purchaseCoinsPkg, coins]);

  // ── Gift logic (unchanged) ──
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
      Alert.alert('코인 부족', '코인이 부족해요. 코인을 충전하시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '코인 충전하기',
          onPress: () => setMainTab('coins'),
        },
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
  }, [coins, ownedIds, purchaseItem]);

  // ── Renderers ──
  const renderCosmeticItem = useCallback(({ item, index }: { item: Cosmetic; index: number }) => {
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

  const renderCoinProduct = useCallback(({ item, index }: { item: CoinProduct; index: number }) => {
    const isPurchasing = purchasingCoinId === item.id;
    const perCoin = Math.round(item.price_krw / item.coins * 100) / 100;
    const bestValue = item.id === 'wh_coins_20000';
    const popular = item.id === 'wh_coins_1200';

    return (
      <Animated.View entering={FadeInUp.delay(index * 80).duration(400)}>
        <Pressable
          style={[
            styles.coinCard,
            bestValue && styles.coinCardBest,
          ]}
          onPress={() => handleCoinPurchase(item)}
          disabled={isPurchasing || premiumLoading}
        >
          {(item.badge || bestValue || popular) && (
            <View style={[styles.coinBadge, bestValue && styles.coinBadgeBest]}>
              <Text style={styles.coinBadgeText}>
                {item.badge ?? (bestValue ? '최고 가성비' : '인기')}
              </Text>
            </View>
          )}

          <View style={styles.coinCardLeft}>
            <Text style={styles.coinAmount}>🪙 {item.coins.toLocaleString()}</Text>
            <Text style={styles.coinPerUnit}>코인당 ₩{perCoin.toFixed(1)}</Text>
          </View>

          <View style={styles.coinCardRight}>
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <LinearGradient
                colors={bestValue ? [BRAND.gold, '#E8A317'] : [BRAND.primary, '#1AAD8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.coinPriceBtn}
              >
                <Text style={styles.coinPriceText}>
                  ₩{item.price_krw.toLocaleString()}
                </Text>
              </LinearGradient>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [purchasingCoinId, premiumLoading, handleCoinPurchase]);

  const COSMETIC_TABS: { key: CosmeticTab; label: string }[] = [
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
        <View style={styles.coinHeaderBadge}>
          <Text style={styles.coinHeaderText}>🪙 {coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Main Tabs: 코스메틱 / 코인 충전 */}
      <View style={styles.mainTabRow}>
        <Pressable
          style={[styles.mainTab, mainTab === 'cosmetics' && styles.mainTabActive]}
          onPress={() => { setMainTab('cosmetics'); Haptics.selectionAsync(); }}
        >
          <Ionicons
            name="color-palette-outline"
            size={16}
            color={mainTab === 'cosmetics' ? '#FFF' : COLORS.textMuted}
          />
          <Text style={[styles.mainTabText, mainTab === 'cosmetics' && styles.mainTabTextActive]}>
            코스메틱
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTab, mainTab === 'coins' && styles.mainTabActive]}
          onPress={() => { setMainTab('coins'); Haptics.selectionAsync(); }}
        >
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={[styles.mainTabText, mainTab === 'coins' && styles.mainTabTextActive]}>
            코인 충전
          </Text>
        </Pressable>
      </View>

      {mainTab === 'cosmetics' ? (
        <>
          {/* Cosmetic Sub-tabs */}
          <View style={styles.tabRow}>
            {COSMETIC_TABS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.tab, cosmeticTab === key && styles.tabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCosmeticTab(key);
                }}
              >
                <Text style={[styles.tabText, cosmeticTab === key && styles.tabTextActive]}>
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

          {/* Cosmetic Grid */}
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={BRAND.primary} />
            </View>
          ) : (
            <FlatList
              data={purchasableItems}
              renderItem={renderCosmeticItem}
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
        </>
      ) : (
        /* ── 코인 충전 탭 ── */
        <ScrollView
          style={styles.coinScrollView}
          contentContainerStyle={[styles.coinContent, { paddingBottom: insets.bottom + SPACING.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero banner */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <LinearGradient
              colors={[BRAND.gold, '#E8A317', COLORS.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coinHero}
            >
              <Text style={styles.coinHeroEmoji}>🪙</Text>
              <Text style={styles.coinHeroTitle}>코인 충전</Text>
              <Text style={styles.coinHeroSub}>코스메틱 구매, 선물, 부스터에 사용하세요</Text>
              <View style={styles.coinHeroBalance}>
                <Text style={styles.coinHeroBalanceText}>
                  현재 잔액: {coins.toLocaleString()} 코인
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Coin packs */}
          <Text style={styles.coinSectionTitle}>코인 팩</Text>

          {!coinProductsLoaded ? (
            <ActivityIndicator size="large" color={BRAND.gold} style={{ marginVertical: SPACING.xl }} />
          ) : (
            <FlatList
              data={coinProducts}
              renderItem={renderCoinProduct}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ gap: SPACING.md }}
            />
          )}

          {/* Earn coins info */}
          <View style={styles.earnSection}>
            <Text style={styles.earnTitle}>무료로 코인 얻기</Text>
            <View style={styles.earnList}>
              {[
                { emoji: '🏁', label: '이벤트 완료', value: '난이도 × 20' },
                { emoji: '📅', label: '일일 로그인', value: '+10 / 7일 연속 +50' },
                { emoji: '❓', label: '퀴즈 정답', value: '+5' },
                { emoji: '📍', label: '체크인', value: '+3' },
                { emoji: '👋', label: '친구 초대', value: '+100' },
              ].map((item) => (
                <View key={item.label} style={styles.earnRow}>
                  <Text style={styles.earnEmoji}>{item.emoji}</Text>
                  <Text style={styles.earnLabel}>{item.label}</Text>
                  <Text style={styles.earnValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Premium upsell */}
          <Pressable
            style={styles.premiumBanner}
            onPress={() => router.push('/premium')}
          >
            <Text style={styles.premiumBannerEmoji}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumBannerTitle}>프리미엄으로 더 많이 얻기</Text>
              <Text style={styles.premiumBannerSub}>
                XP 2배, 프리미엄 스킨, AI 대화 무제한
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={BRAND.primary} />
          </Pressable>
        </ScrollView>
      )}

      {/* Gift friend modal */}
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  coinHeaderBadge: {
    backgroundColor: `${BRAND.gold}20`, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full,
  },
  coinHeaderText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.gold },

  // Main tabs
  mainTabRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginTop: SPACING.md,
  },
  mainTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight,
  },
  mainTabActive: { backgroundColor: BRAND.primary },
  mainTabText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  mainTabTextActive: { color: '#FFF', fontWeight: FONT_WEIGHT.bold },

  // Cosmetic sub-tabs
  tabRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginTop: SPACING.md,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight,
  },
  tabActive: { backgroundColor: BRAND.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textMuted },
  tabTextActive: { color: '#FFF', fontWeight: FONT_WEIGHT.bold },

  slotFilterRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginVertical: SPACING.md },
  slotChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight,
  },
  slotChipActive: { backgroundColor: `${BRAND.primary}25`, borderWidth: 1, borderColor: BRAND.primary },
  slotChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  slotChipTextActive: { color: BRAND.primary, fontWeight: FONT_WEIGHT.bold },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: SPACING.lg },
  gridContent: { paddingBottom: SPACING.xxxl },
  cardWrapper: { width: '48%', marginBottom: SPACING.md },
  card: {
    alignItems: 'stretch', padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    borderWidth: 2, minHeight: 150,
  },
  cardMainTap: { alignItems: 'center' },
  cardEmoji: { fontSize: 36, marginBottom: SPACING.xs },
  cardName: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, textAlign: 'center',
  },
  cardEffect: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  cardRarity: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },
  priceBadge: {
    backgroundColor: `${BRAND.gold}20`, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.sm,
  },
  priceText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.gold },
  ownedBadge: {
    backgroundColor: `${BRAND.primary}20`, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.sm,
  },
  ownedText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.primary },
  giftBtn: {
    marginTop: SPACING.sm, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, backgroundColor: `${BRAND.primary}18`,
    borderWidth: 1, borderColor: `${BRAND.primary}40`, alignItems: 'center',
  },
  giftBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: BRAND.primary },

  // Gift modal
  giftModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  giftSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.xl, maxHeight: '70%',
  },
  giftSheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  giftSheetSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.sm },
  giftFriendList: { maxHeight: 320, marginTop: SPACING.lg },
  giftFriendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  giftFriendName: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semibold },
  giftEmpty: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SPACING.xl },
  giftCancelBtn: { marginTop: SPACING.lg, alignItems: 'center', padding: SPACING.md },
  giftCancelText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },

  // ── Coin tab ──
  coinScrollView: { flex: 1 },
  coinContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  coinHero: {
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.xxl,
    alignItems: 'center', marginBottom: SPACING.xl, ...SHADOWS.md,
  },
  coinHeroEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  coinHeroTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.extrabold, color: '#FFF' },
  coinHeroSub: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.85)', marginTop: SPACING.xs },
  coinHeroBalance: {
    marginTop: SPACING.lg, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full,
  },
  coinHeroBalanceText: { color: '#FFF', fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },

  coinSectionTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.lg,
  },

  coinCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    position: 'relative', overflow: 'visible',
  },
  coinCardBest: { borderColor: BRAND.gold, borderWidth: 2 },
  coinCardLeft: { flex: 1 },
  coinAmount: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.textPrimary },
  coinPerUnit: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  coinCardRight: { marginLeft: SPACING.md },
  coinPriceBtn: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  coinPriceText: { color: '#FFF', fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },
  coinBadge: {
    position: 'absolute', top: -10, left: SPACING.lg,
    backgroundColor: BRAND.coral, paddingHorizontal: SPACING.sm,
    paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },
  coinBadgeBest: { backgroundColor: BRAND.gold },
  coinBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },

  // Earn section
  earnSection: {
    marginTop: SPACING.xxl, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.sm,
  },
  earnTitle: {
    fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.lg,
  },
  earnList: { gap: SPACING.md },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  earnEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  earnLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary },
  earnValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: BRAND.gold },

  // Premium upsell
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginTop: SPACING.xl, backgroundColor: `${BRAND.primary}12`,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: `${BRAND.primary}30`,
  },
  premiumBannerEmoji: { fontSize: 28 },
  premiumBannerTitle: {
    fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary,
  },
  premiumBannerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
});
