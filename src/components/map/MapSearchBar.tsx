import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  FONT_FAMILY,
} from '../../config/theme';

/**
 * 지도 상단의 만화 톤 검색바 + 알림 종 (Spec §1.1).
 *
 * 디자인 (WhereHere_Manga.html):
 *   - 검색바: 종이 배경 흰 pill + 잉크 외곽선 2.5px + hard shadow + "오늘 어디로?!" placeholder
 *   - 우측 알림: 파란 원 + 빨간 도트(미확인 카운트)
 */

interface Props {
  placeholder?: string;
  /** 미확인 알림 수 — 0 이면 도트 안 보임 */
  unreadCount?: number;
  onSearchPress?: () => void;
  onBellPress?: () => void;
}

function MapSearchBarInner({
  placeholder = '오늘 어디로?!',
  unreadCount = 0,
  onSearchPress,
  onBellPress,
}: Props) {
  const offset = MANGA_SHADOW_OFFSET.md;

  return (
    <View style={styles.row}>
      {/* 검색 pill */}
      <Pressable
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.selectionAsync().catch(() => {});
          }
          onSearchPress?.();
        }}
        style={({ pressed }) => [
          styles.searchWrap,
          { transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined },
        ]}
      >
        <View style={[styles.searchShadow, { top: offset, left: offset }]} />
        <View style={styles.searchBody}>
          <Ionicons name="search" size={18} color={MANGA.ink} style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder} allowFontScaling={false} numberOfLines={1}>
            {placeholder}
          </Text>
        </View>
      </Pressable>

      {/* 알림 종 */}
      <Pressable
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.selectionAsync().catch(() => {});
          }
          onBellPress?.();
        }}
        style={({ pressed }) => [
          styles.bellWrap,
          { transform: pressed ? [{ translateX: offset }, { translateY: offset }] : undefined },
        ]}
      >
        <View style={[styles.bellShadow, { top: offset, left: offset }]} />
        <View style={styles.bellBody}>
          <Ionicons name="notifications-outline" size={22} color={MANGA.ink} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} allowFontScaling={false}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const SEARCH_HEIGHT = 48;
const BELL_SIZE = 48;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // ── search ──
  searchWrap: {
    flex: 1,
    height: SEARCH_HEIGHT,
    position: 'relative',
  },
  searchShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.pill,
  },
  searchBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MANGA.paper,
    borderRadius: MANGA_RADIUS.pill,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    paddingHorizontal: 18,
  },
  searchPlaceholder: {
    flex: 1,
    color: MANGA.ink,
    opacity: 0.5,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  // ── bell ──
  bellWrap: {
    width: BELL_SIZE,
    height: BELL_SIZE,
    position: 'relative',
  },
  bellShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BELL_SIZE,
    height: BELL_SIZE,
    backgroundColor: MANGA.ink,
    borderRadius: BELL_SIZE / 2,
  },
  bellBody: {
    width: BELL_SIZE,
    height: BELL_SIZE,
    borderRadius: BELL_SIZE / 2,
    backgroundColor: MANGA.b,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: MANGA.r,
    borderWidth: 2,
    borderColor: MANGA.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: MANGA.paper,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
    fontWeight: '900',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
});

export const MapSearchBar = memo(MapSearchBarInner);
