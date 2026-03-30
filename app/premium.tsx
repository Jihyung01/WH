import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { usePremiumStore } from '../src/stores/premiumStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BRAND,
  BORDER_RADIUS,
  SHADOWS,
} from '../src/config/theme';

const BENEFITS = [
  { emoji: '🎯', title: 'XP 2배 부스트', desc: '모든 활동에서 2배 XP' },
  { emoji: '🎨', title: '프리미엄 스킨', desc: '한정 캐릭터 스킨 잠금해제' },
  { emoji: '🗺️', title: '전용 이벤트', desc: '프리미엄 회원만의 특별 이벤트' },
  { emoji: '💬', title: 'AI 대화 무제한', desc: '캐릭터와 하루 20회→무제한 대화' },
  { emoji: '📝', title: '이벤트 생성 10개', desc: 'UGC 이벤트 하루 10개까지' },
  { emoji: '🏆', title: '시즌 패스 프리미엄', desc: '프리미엄 보상 트랙 해금' },
];

type PlanType = 'monthly' | 'annual';

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading, offerings, checkStatus, loadOfferings, purchase, restore } =
    usePremiumStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    checkStatus();
    loadOfferings();
  }, []);

  const hasOfferings = offerings.length > 0;

  const handlePurchase = useCallback(async () => {
    if (!hasOfferings) {
      Alert.alert('안내', '준비 중입니다');
      return;
    }

    const pkg = selectedPlan === 'annual' ? offerings[1] ?? offerings[0] : offerings[0];
    if (!pkg) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await purchase(pkg);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('환영합니다!', '프리미엄 회원이 되었습니다 🎉');
    } else if (result.error && result.error !== 'cancelled') {
      Alert.alert('오류', '구매 처리 중 문제가 발생했습니다.');
    }
  }, [hasOfferings, offerings, selectedPlan, purchase]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const restored = await restore();
    setRestoring(false);

    if (restored) {
      Alert.alert('복원 완료', '프리미엄이 복원되었습니다!');
    } else {
      Alert.alert('안내', '복원할 구매 내역이 없습니다.');
    }
  }, [restore]);

  if (isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>프리미엄</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.premiumActiveContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.premiumActiveContent}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark-circle" size={72} color={BRAND.primary} />
            </View>
            <Text style={styles.premiumActiveTitle}>프리미엄 회원입니다</Text>
            <Text style={styles.premiumActiveDesc}>
              모든 프리미엄 혜택을 이용하고 있습니다
            </Text>

            <View style={styles.activeBenefitsGrid}>
              {BENEFITS.map((b) => (
                <View key={b.title} style={styles.activeBenefitItem}>
                  <Text style={styles.activeBenefitEmoji}>{b.emoji}</Text>
                  <Text style={styles.activeBenefitTitle}>{b.title}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>프리미엄</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <LinearGradient
            colors={[BRAND.primary, '#1AAD8A', COLORS.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.crownContainer}>
              <Text style={styles.crownIcon}>👑</Text>
            </View>
            <Text style={styles.heroTitle}>WhereHere Premium</Text>
            <Text style={styles.heroSubtitle}>더 풍부한 탐험 경험을 즐기세요</Text>
          </LinearGradient>
        </Animated.View>

        {/* Benefits */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <Text style={styles.sectionTitle}>프리미엄 혜택</Text>
          <View style={styles.benefitsList}>
            {BENEFITS.map((b, i) => (
              <Animated.View
                key={b.title}
                entering={FadeInUp.duration(400).delay(300 + i * 60)}
                style={styles.benefitCard}
              >
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Pricing Cards */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)}>
          <Text style={styles.sectionTitle}>요금제 선택</Text>
          <View style={styles.pricingRow}>
            {/* Monthly */}
            <Pressable
              style={[
                styles.pricingCard,
                selectedPlan === 'monthly' && styles.pricingCardSelected,
              ]}
              onPress={() => {
                setSelectedPlan('monthly');
                Haptics.selectionAsync();
              }}
            >
              {selectedPlan === 'monthly' && (
                <View style={styles.selectedDot}>
                  <Ionicons name="checkmark-circle" size={20} color={BRAND.primary} />
                </View>
              )}
              <Text style={styles.pricingLabel}>월간</Text>
              <Text style={styles.pricingPrice}>₩4,900</Text>
              <Text style={styles.pricingPeriod}>/ 월</Text>
            </Pressable>

            {/* Annual */}
            <Pressable
              style={[
                styles.pricingCard,
                selectedPlan === 'annual' && styles.pricingCardSelected,
              ]}
              onPress={() => {
                setSelectedPlan('annual');
                Haptics.selectionAsync();
              }}
            >
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>32% 할인</Text>
              </View>
              {selectedPlan === 'annual' && (
                <View style={styles.selectedDot}>
                  <Ionicons name="checkmark-circle" size={20} color={BRAND.primary} />
                </View>
              )}
              <Text style={styles.pricingLabel}>연간</Text>
              <Text style={styles.pricingPrice}>₩39,900</Text>
              <Text style={styles.pricingPeriod}>/ 년</Text>
              <Text style={styles.pricingMonthly}>월 ₩3,325</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Purchase Button */}
        <Animated.View entering={FadeInUp.duration(500).delay(700)}>
          <Pressable
            style={[styles.purchaseButton, isLoading && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {hasOfferings ? '프리미엄 시작하기' : '준비 중입니다'}
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Restore */}
        <Animated.View entering={FadeInDown.duration(400).delay(800)}>
          <Pressable
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
              <Text style={styles.restoreText}>구매 복원</Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Hero
  heroGradient: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  crownContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  crownIcon: {
    fontSize: 36,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255,255,255,0.85)',
  },

  // Benefits
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  benefitsList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.lg,
    ...SHADOWS.sm,
  },
  benefitEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // Pricing
  pricingRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'visible',
  },
  pricingCardSelected: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}08`,
    ...SHADOWS.glow,
  },
  selectedDot: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  pricingLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  pricingPrice: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
  },
  pricingPeriod: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pricingMonthly: {
    fontSize: FONT_SIZE.xs,
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: SPACING.sm,
  },
  discountBadge: {
    position: 'absolute',
    top: -10,
    right: -4,
    backgroundColor: BRAND.coral,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  discountText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Purchase button
  purchaseButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.glow,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  restoreText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },

  // Premium active state
  premiumActiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  premiumActiveContent: {
    alignItems: 'center',
  },
  checkCircle: {
    marginBottom: SPACING.xl,
  },
  premiumActiveTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  premiumActiveDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  activeBenefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  activeBenefitItem: {
    alignItems: 'center',
    width: 90,
    gap: SPACING.xs,
  },
  activeBenefitEmoji: {
    fontSize: 28,
  },
  activeBenefitTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
