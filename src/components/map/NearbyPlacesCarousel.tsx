import React, { memo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  FONT_FAMILY,
} from '../../config/theme';

/**
 * 지도 하단 "근처 탐험지" 가로 스크롤 (Spec §1.1).
 *
 * 디자인:
 *   - 카드: 컬러 그라디언트 배경 → 만화 톤이라 단색 + 잉크 외곽선으로 단순화
 *   - 좌상단 거리 chip (검정 + 노랑 텍스트)
 *   - 우상단 HOT/NEW 뱃지 (선택)
 *   - 본문: 이모지 + 장소명 + 부제 (카페 N곳 / 친구 N명 등)
 */

export interface NearbyPlace {
  id: string;
  emoji?: string;          // ☕ 🌳 🌸 etc.
  title: string;            // "정자동 카페거리"
  subtitle?: string;        // "카페 12곳 · 친구 2명"
  distanceM: number;        // 80 → "80m" / 1200 → "1.2km"
  badge?: 'HOT' | 'NEW' | null;
  /** 카드 배경 단색 (없으면 paper) */
  background?: string;
}

interface Props {
  title?: string;
  count?: number;
  places: NearbyPlace[];
  onPlacePress?: (place: NearbyPlace) => void;
  onSeeAllPress?: () => void;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

const PlaceCard = memo(function PlaceCard({
  place,
  onPress,
}: {
  place: NearbyPlace;
  onPress?: (p: NearbyPlace) => void;
}) {
  const offset = MANGA_SHADOW_OFFSET.md;
  const bg = place.background ?? MANGA.paper;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.(place);
      }}
      style={({ pressed }) => [
        styles.cardWrap,
        { transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined },
      ]}
    >
      <View style={[styles.cardShadow, { top: offset, left: offset }]} />
      <View style={[styles.cardBody, { backgroundColor: bg }]}>
        {/* badge */}
        {place.badge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: place.badge === 'HOT' ? MANGA.r : MANGA.g },
            ]}
          >
            <Text style={styles.badgeText} allowFontScaling={false}>
              {place.badge}
            </Text>
          </View>
        ) : null}

        {/* distance chip */}
        <View style={styles.distChip}>
          <Text style={styles.distChipText} allowFontScaling={false}>
            {formatDistance(place.distanceM)}
          </Text>
        </View>

        {/* spacer */}
        <View style={{ flex: 1 }} />

        {/* body */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} allowFontScaling={false} numberOfLines={1}>
            {place.emoji ? `${place.emoji} ` : ''}
            {place.title}
          </Text>
          {place.subtitle ? (
            <Text style={styles.cardSubtitle} allowFontScaling={false} numberOfLines={1}>
              {place.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

function NearbyPlacesCarouselInner({
  title = '근처 탐험지',
  count,
  places,
  onPlacePress,
  onSeeAllPress,
}: Props) {
  if (!places.length) return null;
  const offsetSm = MANGA_SHADOW_OFFSET.sm;

  return (
    <View style={styles.outer}>
      {/* 헤더: 제목 + count chip + 전체보기 */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>
          {title}
        </Text>
        {typeof count === 'number' ? (
          <View style={styles.countChipWrap}>
            <View style={[styles.countChipShadow, { top: offsetSm, left: offsetSm }]} />
            <View style={styles.countChipBody}>
              <Text style={styles.countChipText} allowFontScaling={false}>
                {count}
              </Text>
            </View>
          </View>
        ) : null}
        {onSeeAllPress ? (
          <Pressable onPress={onSeeAllPress} style={{ marginLeft: 'auto' }}>
            <Text style={styles.seeAll} allowFontScaling={false}>
              전체 ›
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* 가로 스크롤 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollPad}
        decelerationRate="fast"
        snapToInterval={CARD_W + CARD_GAP}
      >
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} onPress={onPlacePress} />
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_W = 196;
const CARD_H = 140;
const CARD_GAP = 12;

const styles = StyleSheet.create({
  outer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  title: {
    color: MANGA.ink,
    fontSize: 16,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  countChipWrap: {
    width: 26,
    height: 26,
    position: 'relative',
  },
  countChipShadow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MANGA.ink,
  },
  countChipBody: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MANGA.b,
    borderWidth: 2,
    borderColor: MANGA.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChipText: {
    color: MANGA.ink,
    fontSize: 12,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
  seeAll: {
    color: MANGA.r,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
  },
  scrollPad: {
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  // ── card ──
  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_W,
    height: CARD_H,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.ink,
  },
  cardBody: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 12,
    flexDirection: 'column',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: MANGA_RADIUS.chipLg,
    borderWidth: 2,
    borderColor: MANGA.ink,
  },
  badgeText: {
    color: MANGA.paper,
    fontSize: 10,
    fontFamily: FONT_FAMILY.primaryBold,
    fontWeight: '900',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  distChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.chipLg,
  },
  distChipText: {
    color: MANGA.y,
    fontSize: 12,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
  cardFooter: {
    gap: 2,
  },
  cardTitle: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  cardSubtitle: {
    color: MANGA.ink,
    opacity: 0.6,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primary,
    includeFontPadding: false,
  },
});

export const NearbyPlacesCarousel = memo(NearbyPlacesCarouselInner);
