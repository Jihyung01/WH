/**
 * 캐릭터 화면 — manga 톤 (Spec §4 + 통합 패스).
 *
 * 5탭 구조에서 빠졌고, 프로필 허브의 "캐릭터" 타일에서 진입.
 * 데이터/액션은 기존 그대로 (characterStore + cosmetic 시스템). 시각만 manga.
 */
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { useCharacterStore, getLevelTitle, xpForLevel } from '../../src/stores/characterStore';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, MANGA_SHADOW_OFFSET, FONT_FAMILY } from '../../src/config/theme';
import { MOOD_DISPLAY, SLOT_CONFIG } from '../../src/components/cosmetic/constants';
import { EquippedEffectBar } from '../../src/components/cosmetic/EquippedEffectBar';
import { InkCard, InkButton, MangaChip } from '../../src/components/ui';
import type { CharacterLoadout } from '../../src/types';
import type { CosmeticSlot } from '../../src/types/enums';

function getSlotEmoji(loadout: CharacterLoadout[], slot: CosmeticSlot): string | null {
  return loadout.find((l) => l.slot === slot)?.cosmetic?.preview_emoji ?? null;
}

export default function CharacterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    character, loadout, equippedEffects, coins, mood, favoriteDistrict,
    personalityTraits, activeTitle,
    fetchCharacter, fetchLoadout, fetchCoins,
  } = useCharacterStore();

  const [refreshing, setRefreshing] = useState(false);

  const characterType = character?.character_type ?? 'explorer';
  const level = character?.level ?? 1;
  const xp = character?.xp ?? 0;
  const charName = character?.name ?? '도담';
  const levelTitle = getLevelTitle(characterType, level);
  const nextLevelXp = xpForLevel(level);
  const xpProgress = nextLevelXp > 0 ? Math.min(xp / nextLevelXp, 1) : 0;
  const moodInfo = MOOD_DISPLAY[mood] ?? MOOD_DISPLAY.happy;

  useEffect(() => {
    fetchCharacter();
    fetchLoadout();
    fetchCoins();
  }, [fetchCharacter, fetchLoadout, fetchCoins]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCharacter(), fetchLoadout(), fetchCoins()]);
    setRefreshing(false);
  }, [fetchCharacter, fetchLoadout, fetchCoins]);

  const offset = MANGA_SHADOW_OFFSET.md;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MANGA.ink} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── 헤더: 캐릭터 + 코인 칩 + 뒤로가기 ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>캐릭터</Text>
          <View style={styles.coinPillWrap}>
            <View style={[styles.coinPillShadow, { top: 2, left: 2 }]} />
            <View style={styles.coinPill}>
              <Text style={styles.coinEmoji} allowFontScaling={false}>🪙</Text>
              <Text style={styles.coinText} allowFontScaling={false}>
                {coins.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 무대(스테이지) — 풀바디 + 이름/레벨/기분 ── */}
        <Animated.View entering={FadeIn.duration(400)}>
          <InkCard
            radius="cardLg"
            shadow="md"
            pad={{ v: 24, h: 18 }}
            style={{ marginHorizontal: 16, marginTop: 4, alignItems: 'center' }}
            background={MANGA.paper}
          >
            {/* 칭호 */}
            <Pressable
              onPress={() => router.push('/titles' as never)}
              style={styles.titleRow}
              hitSlop={6}
            >
              <Text style={styles.titleText} allowFontScaling={false}>
                {activeTitle ?? levelTitle}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={MANGA.ink} style={{ opacity: 0.5 }} />
            </Pressable>

            {/* 캐릭터 — manga 톤 ring 두름 */}
            <View style={styles.avatarRingWrap}>
              <View style={[styles.avatarRingShadow, { top: 4, left: 4 }]} />
              <View style={styles.avatarRing}>
                <CharacterAvatar
                  characterType={characterType}
                  level={level}
                  size={188}
                  showEvolutionBadge
                  loadout={loadout}
                  favoriteDistrict={favoriteDistrict ?? character?.favorite_district}
                  mood={mood}
                  borderColor={MANGA.ink}
                  backgroundColor={MANGA.paper2}
                />
              </View>
            </View>

            {/* 이름 + 레벨 (display 폰트) */}
            <Text style={styles.charName} allowFontScaling={false}>
              Lv.{level} <Text style={styles.charNameAccent}>{charName}</Text>
            </Text>

            {/* XP bar */}
            <View style={styles.xpRow}>
              <View style={styles.xpBarTrack}>
                <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
              </View>
              <Text style={styles.xpText} allowFontScaling={false}>
                {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
              </Text>
            </View>

            {/* 기분 */}
            <Text style={styles.moodText} allowFontScaling={false}>
              {charName}의 기분: {moodInfo.emoji} {moodInfo.label}
            </Text>

            {/* 효과 (탐지/스트릭 등) */}
            {equippedEffects ? (
              <View style={{ marginTop: 8 }}>
                <EquippedEffectBar effects={equippedEffects} />
              </View>
            ) : null}
          </InkCard>
        </Animated.View>

        {/* ── 코스메틱 슬롯 (5개 가로) ── */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.slotsRow}>
          {SLOT_CONFIG.map(({ key, emoji: slotEmoji, label }) => {
            const equipped = getSlotEmoji(loadout, key);
            return (
              <View key={key} style={styles.slotItem}>
                <View style={[styles.slotShadow, { top: offset, left: offset }]} />
                <View
                  style={[
                    styles.slotCircle,
                    equipped ? styles.slotCircleFilled : null,
                  ]}
                >
                  <Text style={styles.slotEmoji} allowFontScaling={false}>
                    {equipped ?? slotEmoji}
                  </Text>
                </View>
                <Text style={styles.slotLabel} allowFontScaling={false}>{label}</Text>
              </View>
            );
          })}
        </Animated.View>

        {/* ── 성격 특성 (잉크 칩) ── */}
        {personalityTraits && personalityTraits.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(200)}>
            <InkCard
              radius="cardLg"
              shadow="md"
              pad={{ v: 14, h: 14 }}
              style={{ marginHorizontal: 16, marginTop: 14 }}
            >
              <Text style={styles.sectionTitle} allowFontScaling={false}>성격 특성</Text>
              <View style={styles.traitsRow}>
                {personalityTraits.slice(0, 6).map((trait) => (
                  <MangaChip key={trait} label={trait} tone="paper" size="md" />
                ))}
              </View>
            </InkCard>
          </Animated.View>
        ) : null}

        {/* ── 액션 4개 (꾸미기/상점/칭호/대화) ── */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.actionsGrid}>
          <ActionTile
            emoji="🎨"
            label="꾸미기"
            sub="3종 신상"
            background={MANGA.y}
            onPress={() => router.push('/character-customize' as never)}
          />
          <ActionTile
            emoji="🏪"
            label="상점"
            sub="시즌 추천"
            background={MANGA.r}
            color={MANGA.paper}
            onPress={() => router.push('/shop' as never)}
          />
          <ActionTile
            emoji="🏅"
            label="칭호"
            sub="12 / 47"
            background={MANGA.p}
            onPress={() => router.push('/titles' as never)}
          />
          <ActionTile
            emoji="💬"
            label="대화"
            sub="AI 채팅"
            background={MANGA.b}
            onPress={() => router.push('/chat' as never)}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ActionTile({
  emoji,
  label,
  sub,
  background,
  color = MANGA.ink,
  onPress,
}: {
  emoji: string;
  label: string;
  sub?: string;
  background: string;
  color?: string;
  onPress: () => void;
}) {
  const offset = MANGA_SHADOW_OFFSET.md;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionTile,
        pressed && { transform: [{ translateX: offset }, { translateY: offset }] },
      ]}
    >
      <View style={[styles.actionShadow, { top: offset, left: offset }]} />
      <View style={[styles.actionBody, { backgroundColor: background }]}>
        <Text style={styles.actionEmoji} allowFontScaling={false}>{emoji}</Text>
        <Text style={[styles.actionLabel, { color }]} allowFontScaling={false}>{label}</Text>
        {sub ? (
          <Text style={[styles.actionSub, { color }]} allowFontScaling={false}>{sub}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MANGA.paper2,
  },
  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: MANGA.ink,
    fontSize: 24,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  // coin pill
  coinPillWrap: { position: 'relative' },
  coinPillShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: 999,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: MANGA.y,
    borderRadius: 999,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
  },
  coinEmoji: { fontSize: 14 },
  coinText: {
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
  // title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  titleText: {
    color: MANGA.ink,
    opacity: 0.7,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
  },
  // avatar ring
  avatarRingWrap: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingShadow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: MANGA.ink,
  },
  avatarRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: MANGA.paper2,
    borderWidth: 3,
    borderColor: MANGA.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // name
  charName: {
    marginTop: 14,
    color: MANGA.ink,
    fontSize: 22,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  charNameAccent: {
    color: MANGA.r,
  },
  // xp
  xpRow: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  xpBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(26,22,18,0.08)',
    borderWidth: 2,
    borderColor: MANGA.ink,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: MANGA.g,
  },
  xpText: {
    marginTop: 6,
    color: MANGA.ink,
    opacity: 0.65,
    fontSize: 11,
    fontFamily: FONT_FAMILY.mono,
  },
  moodText: {
    marginTop: 8,
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
  },
  // slots
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  slotItem: {
    alignItems: 'center',
    gap: 6,
    width: 60,
    position: 'relative',
  },
  slotShadow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MANGA.ink,
  },
  slotCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MANGA.paper,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCircleFilled: {
    backgroundColor: MANGA.y,
  },
  slotEmoji: { fontSize: 24 },
  slotLabel: {
    color: MANGA.ink,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
  },
  // section
  sectionTitle: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionTile: {
    width: '47.5%',
    aspectRatio: 1.6,
    position: 'relative',
  },
  actionShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  actionBody: {
    flex: 1,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 14,
    justifyContent: 'flex-end',
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  actionSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.primary,
    opacity: 0.7,
    marginTop: 2,
  },
});
