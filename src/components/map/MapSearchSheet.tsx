import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { searchEventsByKeyword } from '../../lib/api';
import type { NearbyEvent } from '../../types';
import {
  FONT_FAMILY,
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  SPACING,
} from '../../config/theme';

export type MapSearchSelection =
  | { kind: 'event'; event: NearbyEvent; latitude: number; longitude: number }
  | { kind: 'place'; id: string; title: string; subtitle: string; latitude: number; longitude: number };

interface MapSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: MapSearchSelection) => void;
}

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

type SearchItem =
  | { kind: 'event'; id: string; event: NearbyEvent }
  | { kind: 'place'; id: string; title: string; subtitle: string; latitude: number; longitude: number };

type PlaceSearchItem = Extract<SearchItem, { kind: 'place' }>;

const MIN_QUERY_LENGTH = 2;

function shortPlaceName(displayName: string): { title: string; subtitle: string } {
  const parts = displayName.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    title: parts[0] ?? displayName,
    subtitle: parts.slice(1, 4).join(' · '),
  };
}

async function searchKoreanPlaces(query: string): Promise<SearchItem[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=kr&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'ko',
      'User-Agent': 'WhereHere/1.2.0',
    },
  });
  if (!response.ok) return [];

  const rows = (await response.json()) as NominatimPlace[];
  return rows
    .map<PlaceSearchItem | null>((row) => {
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      const name = shortPlaceName(row.display_name);
      return {
        kind: 'place' as const,
        id: `place-${row.place_id}`,
        title: name.title,
        subtitle: name.subtitle || '장소 검색 결과',
        latitude,
        longitude,
      };
    })
    .filter((item): item is PlaceSearchItem => item !== null);
}

export function MapSearchSheet({ visible, onClose, onSelect }: MapSearchSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
      const timer = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(timer);
    }
    sheetRef.current?.close();
    return undefined;
  }, [visible]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setItems([]);
      setLoading(false);
      setErrorText(null);
      return undefined;
    }

    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorText(null);
      searchEventsByKeyword(trimmed, 8)
        .then(async (events) => {
          if (!alive) return;
          if (events.length > 0) {
            setItems(events.map((event) => ({ kind: 'event' as const, id: event.id, event })));
            return;
          }
          const places = await searchKoreanPlaces(trimmed);
          if (alive) setItems(places);
        })
        .catch(() => {
          if (!alive) return;
          setItems([]);
          setErrorText('검색 결과를 불러오지 못했어요.');
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.24}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleSelect = useCallback(
    (item: SearchItem): void => {
      Haptics.selectionAsync().catch(() => {});
      if (item.kind === 'event') {
        onSelect({
          kind: 'event',
          event: item.event,
          latitude: item.event.lat,
          longitude: item.event.lng,
        });
      } else {
        onSelect(item);
      }
      onClose();
    },
    [onClose, onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchItem }) => {
      const isEvent = item.kind === 'event';
      const title = isEvent ? item.event.title : item.title;
      const subtitle = isEvent ? item.event.address ?? '탐험 이벤트' : item.subtitle;
      const icon = isEvent ? 'sparkles' : 'location-outline';
      const color = isEvent ? MANGA.y : MANGA.b;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.resultWrap,
            pressed && { transform: [{ translateX: MANGA_SHADOW_OFFSET.sm }, { translateY: MANGA_SHADOW_OFFSET.sm }] },
          ]}
          onPress={() => handleSelect(item)}
        >
          <View style={styles.resultShadow} />
          <View style={styles.resultBody}>
            <View style={[styles.iconBubble, { backgroundColor: color }]}>
              <Ionicons name={icon} size={18} color={MANGA.ink} />
            </View>
            <View style={styles.resultText}>
              <Text style={styles.resultTitle} numberOfLines={1} allowFontScaling={false}>
                {title}
              </Text>
              <Text style={styles.resultSubtitle} numberOfLines={1} allowFontScaling={false}>
                {subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MANGA.ink} />
          </View>
        </Pressable>
      );
    },
    [handleSelect],
  );

  const emptyText =
    query.trim().length < MIN_QUERY_LENGTH
      ? '장소나 이벤트 이름을 두 글자 이상 입력해 주세요.'
      : errorText ?? '아직 맞는 결과가 없어요.';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling={false}>오늘 어디로?!</Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color={MANGA.ink} />
        </Pressable>
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={MANGA.ink} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="정자역, 카페, 산책..."
          placeholderTextColor="rgba(26,22,18,0.45)"
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading ? <ActivityIndicator size="small" color={MANGA.ink} /> : null}
      </View>

      <BottomSheetFlatList
        data={items}
        keyExtractor={(item: SearchItem) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <SearchSkeleton /> : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText} allowFontScaling={false}>{emptyText}</Text>
          </View>
        )}
      />
    </BottomSheet>
  );
}

function SearchSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonTextCol}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: MANGA.paper,
    borderTopLeftRadius: MANGA_RADIUS.cardXl,
    borderTopRightRadius: MANGA_RADIUS.cardXl,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: MANGA.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  title: {
    color: MANGA.ink,
    fontSize: 24,
    fontFamily: FONT_FAMILY.display,
    includeFontPadding: false,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    marginHorizontal: SPACING.xl,
    minHeight: 50,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.paper2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    color: MANGA.ink,
    fontSize: 15,
    fontFamily: FONT_FAMILY.primaryBold,
    paddingVertical: 10,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  resultWrap: {
    minHeight: 68,
    position: 'relative',
  },
  resultShadow: {
    position: 'absolute',
    top: MANGA_SHADOW_OFFSET.md,
    left: MANGA_SHADOW_OFFSET.md,
    right: 0,
    bottom: 0,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.ink,
  },
  resultBody: {
    minHeight: 68,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.paper,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: MANGA.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    color: MANGA.ink,
    fontSize: 15,
    fontFamily: FONT_FAMILY.primaryBold,
    includeFontPadding: false,
  },
  resultSubtitle: {
    color: MANGA.ink,
    opacity: 0.58,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primary,
    marginTop: 4,
    includeFontPadding: false,
  },
  emptyBox: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    textAlign: 'center',
    lineHeight: 20,
  },
  skeletonWrap: {
    gap: SPACING.md,
  },
  skeletonRow: {
    minHeight: 68,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.paper2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    opacity: 0.72,
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,22,18,0.14)',
  },
  skeletonTextCol: {
    flex: 1,
    gap: SPACING.sm,
  },
  skeletonTitle: {
    width: '68%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(26,22,18,0.14)',
  },
  skeletonSubtitle: {
    width: '46%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(26,22,18,0.1)',
  },
});
