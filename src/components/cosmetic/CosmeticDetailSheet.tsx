import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import {
  COLORS, SPACING, FONT_SIZE, FONT_WEIGHT,
  BORDER_RADIUS, SHADOWS, BRAND,
} from '../../config/theme';
import { RARITY_COLORS, RARITY_LABELS, UNLOCK_METHOD_LABELS } from './constants';
import type { Cosmetic } from '../../types';

interface Props {
  cosmetic: Cosmetic | null;
  isOwned: boolean;
  isEquipped: boolean;
  coins: number;
  isPurchasing: boolean;
  onClose: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  onPurchase: () => void;
  onNavigateShop: () => void;
}

export function CosmeticDetailSheet({
  cosmetic,
  isOwned,
  isEquipped,
  coins,
  isPurchasing,
  onClose,
  onEquip,
  onUnequip,
  onPurchase,
  onNavigateShop,
}: Props) {
  if (!cosmetic) return null;

  const rarityColor = RARITY_COLORS[cosmetic.rarity] ?? RARITY_COLORS.common;
  const canAfford = coins >= cosmetic.coin_price;
  const isPurchasable = cosmetic.unlock_method === 'purchase' && cosmetic.coin_price > 0;
  const effectText = getEffectDescription(cosmetic);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={styles.sheet}
        >
          <Pressable>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>{cosmetic.preview_emoji}</Text>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{cosmetic.name}</Text>
                <Text style={[styles.rarity, { color: rarityColor }]}>
                  {RARITY_LABELS[cosmetic.rarity]}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            {/* Description */}
            {cosmetic.description && (
              <Text style={styles.description}>{cosmetic.description}</Text>
            )}

            {/* Effect */}
            {effectText && (
              <View style={styles.effectRow}>
                <Ionicons name="sparkles" size={16} color={BRAND.primary} />
                <Text style={styles.effectText}>{effectText}</Text>
              </View>
            )}

            {/* Actions */}
            {isOwned ? (
              <View style={styles.actions}>
                {isEquipped ? (
                  <Pressable style={styles.unequipBtn} onPress={onUnequip}>
                    <Text style={styles.unequipBtnText}>장착 해제</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.equipBtn} onPress={onEquip}>
                    <Text style={styles.equipBtnText}>장착하기</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.actions}>
                {/* Unlock method info */}
                <View style={styles.unlockInfo}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.unlockText}>
                    {UNLOCK_METHOD_LABELS[cosmetic.unlock_method] ?? '특별 방법으로 획득'}
                  </Text>
                </View>

                {isPurchasable && (
                  <>
                    {canAfford ? (
                      <Pressable
                        style={styles.purchaseBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onPurchase();
                        }}
                        disabled={isPurchasing}
                      >
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.purchaseBtnText}>
                            🪙 {cosmetic.coin_price} 코인으로 구매
                          </Text>
                        )}
                      </Pressable>
                    ) : (
                      <>
                        <Pressable style={styles.purchaseBtnDisabled} disabled>
                          <Text style={styles.purchaseBtnDisabledText}>
                            🪙 {cosmetic.coin_price} 코인 (부족)
                          </Text>
                        </Pressable>
                        <Pressable style={styles.shopLink} onPress={onNavigateShop}>
                          <Text style={styles.shopLinkText}>코인 충전하기</Text>
                        </Pressable>
                      </>
                    )}
                  </>
                )}

                {cosmetic.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={14} color={BRAND.gold} />
                    <Text style={styles.premiumText}>프리미엄 전용</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function getEffectDescription(cosmetic: Cosmetic): string | null {
  if (!cosmetic.effect_type || cosmetic.effect_type === 'cosmetic_only') return null;
  if (cosmetic.effect_description) return cosmetic.effect_description;
  switch (cosmetic.effect_type) {
    case 'xp_boost': return `경험치 획득량 ${cosmetic.effect_value}% 증가`;
    case 'discovery_range': return `탐지 범위 ${cosmetic.effect_value}m 확장`;
    case 'streak_shield': return '연속 출석 보호 (하루 건너뛰어도 스트릭 유지)';
    case 'coin_bonus': return `코인 획득량 ${cosmetic.effect_value}% 증가`;
    default: return null;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceHighlight,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 48,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  rarity: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${BRAND.primary}10`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  effectText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: BRAND.primary,
    flex: 1,
  },
  actions: {
    gap: SPACING.md,
  },
  equipBtn: {
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  equipBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  unequipBtn: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  unequipBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
  },
  unlockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  unlockText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  purchaseBtn: {
    backgroundColor: BRAND.gold,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  purchaseBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#000',
  },
  purchaseBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  purchaseBtnDisabledText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
  },
  shopLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  shopLinkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.primary,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  premiumText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.gold,
  },
});
