/**
 * Phase 6 — 프로필 manga 톤 섹션들 (Spec §5).
 *
 * 한 파일에 5 섹션 (장소 메모리 / 일기장 / 탐험 요약 / AI 노트 / 탐험 허브) 을
 * 모두 정의. 각각 독립 컴포넌트로 export. profile.tsx 에서 차례로 마운트.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  FONT_FAMILY,
} from '../../config/theme';
import { InkCard, MangaChip, MangaAvatar } from '../ui';
import type { Diary, PlaceMemory, ExploreSummary } from '../../lib/api';

// ────────────────────────────────────────
// SECTION 1 — 장소 메모리 (폴라로이드 가로 스크롤)
// ────────────────────────────────────────

interface PlaceMemorySectionProps {
  memories: PlaceMemory[];
  onAddPress: () => void;
  onMemoryPress?: (m: PlaceMemory) => void;
  onSeeAllPress?: () => void;
}

export const PlaceMemorySection = memo(function PlaceMemorySection({
  memories,
  onAddPress,
  onMemoryPress,
  onSeeAllPress,
}: PlaceMemorySectionProps) {
  return (
    <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 16 }} style={{ marginHorizontal: 16, marginTop: 12 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>
          장소 메모리 📸
        </Text>
        {onSeeAllPress ? (
          <Pressable onPress={onSeeAllPress}>
            <Text style={styles.seeAll} allowFontScaling={false}>최근 추가 ›</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 2, paddingTop: 12 }}
      >
        {/* 새 메모리 슬롯 (첫 칸) */}
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
            onAddPress();
          }}
          style={({ pressed }) => [
            styles.polaroid,
            pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          ]}
        >
          <View style={[styles.polaroidShadow, { top: 3, left: 3 }]} />
          <View style={styles.polaroidEmpty}>
            <View style={styles.polaroidDashed}>
              <Ionicons name="add" size={32} color={MANGA.ink} />
            </View>
            <View style={styles.polaroidCaption}>
              <Text style={styles.polaroidEmptyTitle} allowFontScaling={false}>새 메모리</Text>
              <Text style={styles.polaroidEmptySub} allowFontScaling={false}>사진 + 장소</Text>
            </View>
          </View>
        </Pressable>

        {memories.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => onMemoryPress?.(m)}
            style={({ pressed }) => [
              styles.polaroid,
              pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
            ]}
          >
            <View style={[styles.polaroidShadow, { top: 3, left: 3 }]} />
            <View style={styles.polaroidBody}>
              <View style={styles.polaroidPhotoWrap}>
                {m.photo_url ? (
                  <Image source={{ uri: m.photo_url }} style={styles.polaroidPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.polaroidPhoto, { backgroundColor: MANGA.y, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 32 }}>{m.emoji ?? '📷'}</Text>
                  </View>
                )}
                {m.emoji ? (
                  <View style={styles.polaroidEmojiBadge}>
                    <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.polaroidCaption}>
                <Text style={styles.polaroidTitle} allowFontScaling={false} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.polaroidDate} allowFontScaling={false}>{m.memory_date}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </InkCard>
  );
});

// ────────────────────────────────────────
// SECTION 2 — 탐험 일기장
// ────────────────────────────────────────

interface DiarySectionProps {
  diaries: Diary[];
  onCreatePress: () => void;
  onDiaryPress?: (d: Diary) => void;
  onLikePress?: (d: Diary) => void;
  onSharePress?: (d: Diary) => void;
  onMakePublic?: (d: Diary) => void;
  /**
   * 함께한 친구 user_id → 닉네임 매핑 (호출 측에서 미리 조회).
   * 없으면 '?' 로 표시.
   */
  friendNickMap?: Record<string, string>;
}

export const DiarySection = memo(function DiarySection({
  diaries,
  onCreatePress,
  onDiaryPress,
  onLikePress,
  onSharePress,
  onMakePublic,
  friendNickMap = {},
}: DiarySectionProps) {
  return (
    <InkCard radius="cardLg" shadow="md" pad={{ v: 14, h: 16 }} style={{ marginHorizontal: 16, marginTop: 14 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>
          탐험 일기장 📓
        </Text>
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onCreatePress();
          }}
          style={({ pressed }) => [
            styles.newDiaryBtnWrap,
            pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          ]}
        >
          <View style={[styles.newDiaryBtnShadow, { top: 2, left: 2 }]} />
          <View style={styles.newDiaryBtn}>
            <Text style={styles.newDiaryBtnText} allowFontScaling={false}>＋ 새 일기</Text>
          </View>
        </Pressable>
      </View>

      <View style={{ gap: 10, marginTop: 14 }}>
        {diaries.length === 0 ? (
          <View style={styles.emptyDiary}>
            <Text style={styles.emptyDiaryText} allowFontScaling={false}>
              아직 일기가 없어요. 오늘의 한 컷을 남겨봐요!
            </Text>
          </View>
        ) : (
          diaries.map((d) => (
            <DiaryEntry
              key={d.id}
              diary={d}
              friendNickMap={friendNickMap}
              onPress={() => onDiaryPress?.(d)}
              onLike={() => onLikePress?.(d)}
              onShare={() => onSharePress?.(d)}
              onMakePublic={() => onMakePublic?.(d)}
            />
          ))
        )}
      </View>
    </InkCard>
  );
});

// ── single diary entry card ──
const DiaryEntry = memo(function DiaryEntry({
  diary,
  friendNickMap,
  onPress,
  onLike,
  onShare,
  onMakePublic,
}: {
  diary: Diary;
  friendNickMap: Record<string, string>;
  onPress?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  onMakePublic?: () => void;
}) {
  // 날짜 분해: 2026-04-12 → "12 / 4월"
  const dateParts = diary.diary_date.split('-');
  const month = dateParts[1] ? `${parseInt(dateParts[1], 10)}월` : '';
  const day = dateParts[2] ?? '';

  const isPrivate = diary.visibility === 'private';
  const isFriends = diary.visibility === 'friends';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { position: 'relative' },
        pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
      ]}
    >
      <View style={[styles.entryShadow, { top: 3, left: 3 }]} />
      <View
        style={[
          styles.entryBody,
          { backgroundColor: isPrivate ? '#F0E5C0' : MANGA.paper },
        ]}
      >
        {/* 좌측 날짜 스탬프 */}
        <View style={styles.dateStampWrap}>
          <View style={[styles.dateStampShadow, { top: 2, left: 2 }]} />
          <View style={styles.dateStampBody}>
            <Text style={styles.dateStampDay} allowFontScaling={false}>{day}</Text>
            <Text style={styles.dateStampMonth} allowFontScaling={false}>{month}</Text>
          </View>
        </View>

        {/* 우측 본문 */}
        <View style={{ flex: 1, gap: 6 }}>
          {/* 제목 + 공개범위 뱃지 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.diaryTitle} allowFontScaling={false} numberOfLines={1}>
              {diary.title}
            </Text>
            {diary.visibility === 'public' ? (
              <MangaChip label="🌍 전체공개" tone="green" size="sm" />
            ) : isFriends ? (
              <MangaChip label="👥 친구만" tone="yellow" size="sm" />
            ) : (
              <MangaChip label="🔒 비공개" tone="paper" size="sm" />
            )}
          </View>

          {/* 인용문 본문 */}
          <Text style={styles.diaryBody} allowFontScaling={false} numberOfLines={3}>
            "{diary.body}"
          </Text>

          {/* chiplets row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {diary.place_label ? (
              <MangaChip label={`📍 ${diary.place_label}`} tone="paper" size="sm" />
            ) : null}
            {diary.likes_count > 0 ? (
              <Pressable onPress={onLike}>
                <MangaChip label={`❤ ${diary.likes_count}`} tone="paper" size="sm" />
              </Pressable>
            ) : (
              <Pressable onPress={onLike}>
                <MangaChip label="❤" tone="paper" size="sm" />
              </Pressable>
            )}
            {diary.comments_count > 0 ? (
              <MangaChip label={`💬 ${diary.comments_count}`} tone="paper" size="sm" />
            ) : null}
            {!isPrivate ? (
              <Pressable onPress={onShare}>
                <MangaChip label="📤 공유" tone="green" size="sm" />
              </Pressable>
            ) : (
              <Pressable onPress={onMakePublic}>
                <MangaChip label="🌍 공개로 전환" tone="yellow" size="sm" />
              </Pressable>
            )}
          </View>

          {/* 함께한 친구 미니 아바타 */}
          {diary.with_friends.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Text style={styles.withLabel} allowFontScaling={false}>함께</Text>
              {diary.with_friends.slice(0, 4).map((uid) => (
                <MangaAvatar key={uid} name={friendNickMap[uid] ?? '?'} size={22} borderWidth={2} />
              ))}
              {diary.with_friends.length > 4 ? (
                <Text style={styles.moreFriends} allowFontScaling={false}>
                  +{diary.with_friends.length - 4}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

// ────────────────────────────────────────
// SECTION 3 — 탐험 요약 (4 KPI)
// ────────────────────────────────────────

interface ExploreSummarySectionProps {
  summary: ExploreSummary | null;
}

export const ExploreSummarySection = memo(function ExploreSummarySection({
  summary,
}: ExploreSummarySectionProps) {
  const items = [
    { label: '탐험 장소', value: summary?.places_visited ?? 0, color: MANGA.r },
    { label: '도시',     value: summary?.cities_visited ?? 0, color: MANGA.b },
    { label: '기록',     value: summary?.records_count ?? 0, color: MANGA.g },
    { label: '수집품',   value: summary?.collectibles_count ?? 0, color: MANGA.p },
  ];
  return (
    <InkCard radius="cardLg" shadow="md" pad={{ v: 16, h: 16 }} style={{ marginHorizontal: 16, marginTop: 14 }}>
      <Text style={styles.sectionTitle} allowFontScaling={false}>탐험 요약 ✦</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
        {items.map((i) => (
          <View key={i.label} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
            <Text style={[styles.kpiValue, { color: i.color }]} allowFontScaling={false}>
              {i.value.toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel} allowFontScaling={false}>{i.label}</Text>
          </View>
        ))}
      </View>
    </InkCard>
  );
});

// ────────────────────────────────────────
// SECTION 4 — AI 탐험 노트 (Phase 6 placeholder)
// ────────────────────────────────────────

interface AINoteSectionProps {
  /** Edge Function 결과. 없으면 placeholder 노출. */
  note?: { interest?: string; recent_category?: string } | null;
  onPress?: () => void;
}

export const AINoteSection = memo(function AINoteSection({ note, onPress }: AINoteSectionProps) {
  const interest = note?.interest ?? '아늑한 동네 카페';
  const recent = note?.recent_category ?? '카페·산책';
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 16, marginTop: 14 }}>
      {({ pressed }) => (
        <View style={[{ position: 'relative' }, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}>
          <View style={[styles.aiShadow, { top: 3, left: 3 }]} />
          <View style={styles.aiBody}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.aiTitle} allowFontScaling={false}>AI 탐험 노트 🤖</Text>
              <Text style={styles.aiText} allowFontScaling={false} numberOfLines={2}>
                당신은 <Text style={styles.aiAccent}>{interest}</Text>을 좋아해요.{'\n'}
                최근에는 <Text style={styles.aiAccent}>{recent}</Text>를 자주 찾았어요.
              </Text>
            </View>
            <View style={styles.aiRobot}>
              <Text style={{ fontSize: 32 }}>🤖</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
});

// ────────────────────────────────────────
// SECTION 5 — 탐험 허브 (그리드 타일)
// ────────────────────────────────────────

export interface HubTile {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  background?: string;
  onPress: () => void;
}

interface ExploreHubSectionProps {
  tiles: HubTile[];
}

export const ExploreHubSection = memo(function ExploreHubSection({ tiles }: ExploreHubSectionProps) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 14, gap: 10 }}>
      <Text style={[styles.sectionTitle, { paddingHorizontal: 4 }]} allowFontScaling={false}>
        탐험 허브 ✦
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((t) => (
          <HubTileCard key={t.id} tile={t} />
        ))}
      </View>
    </View>
  );
});

const HubTileCard = memo(function HubTileCard({ tile }: { tile: HubTile }) {
  const offset = MANGA_SHADOW_OFFSET.md;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        tile.onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        pressed && { transform: [{ translateX: offset }, { translateY: offset }] },
      ]}
    >
      <View style={[styles.tileShadow, { top: offset, left: offset }]} />
      <View style={[styles.tileBody, { backgroundColor: tile.background ?? MANGA.paper }]}>
        <Text style={{ fontSize: 28, marginBottom: 4 }}>{tile.emoji}</Text>
        <Text style={styles.tileTitle} allowFontScaling={false}>{tile.title}</Text>
        {tile.subtitle ? (
          <Text style={styles.tileSubtitle} allowFontScaling={false} numberOfLines={1}>
            {tile.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

// ────────────────────────────────────────
// styles
// ────────────────────────────────────────

const POLAROID_W = 152;
const POLAROID_H = 184;
const ENTRY_PAD = 12;
const TILE_W = '47.5%';

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: MANGA.ink,
    fontSize: 16,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  seeAll: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  // ── polaroid ──
  polaroid: {
    width: POLAROID_W,
    height: POLAROID_H,
    position: 'relative',
  },
  polaroidShadow: {
    position: 'absolute',
    width: POLAROID_W,
    height: POLAROID_H,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
  },
  polaroidEmpty: {
    width: POLAROID_W,
    height: POLAROID_H,
    backgroundColor: MANGA.paper,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 8,
  },
  polaroidBody: {
    width: POLAROID_W,
    height: POLAROID_H,
    backgroundColor: MANGA.paper,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 8,
  },
  polaroidDashed: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(26,22,18,0.4)',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FFF6CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  polaroidPhotoWrap: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  polaroidPhoto: { width: '100%', height: '100%' },
  polaroidEmojiBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: MANGA.paper,
    borderWidth: 1.5,
    borderColor: MANGA.ink,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  polaroidCaption: {
    paddingTop: 8,
  },
  polaroidEmptyTitle: {
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  polaroidEmptySub: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primary,
    marginTop: 1,
  },
  polaroidTitle: {
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  polaroidDate: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 11,
    fontFamily: FONT_FAMILY.mono,
    marginTop: 1,
  },
  // ── new diary button ──
  newDiaryBtnWrap: {
    position: 'relative',
  },
  newDiaryBtnShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.chipLg,
  },
  newDiaryBtn: {
    backgroundColor: MANGA.r,
    borderRadius: MANGA_RADIUS.chipLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newDiaryBtnText: {
    color: MANGA.paper,
    fontSize: 12,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  // ── diary entry ──
  emptyDiary: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyDiaryText: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primary,
  },
  entryShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  entryBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: ENTRY_PAD,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    // 노트 라인 베이지 (원본 디자인의 ruled paper)
    backgroundColor: MANGA.paper,
  },
  // ── date stamp ──
  dateStampWrap: {
    width: 50,
    position: 'relative',
  },
  dateStampShadow: {
    position: 'absolute',
    width: 50,
    height: 56,
    backgroundColor: MANGA.ink,
    borderRadius: 10,
  },
  dateStampBody: {
    width: 50,
    height: 56,
    borderRadius: 10,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.b,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  dateStampDay: {
    color: MANGA.ink,
    fontSize: 22,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -1,
    lineHeight: 22,
    includeFontPadding: false,
  },
  dateStampMonth: {
    color: MANGA.ink,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
    marginTop: 4,
    includeFontPadding: false,
  },
  diaryTitle: {
    color: MANGA.ink,
    fontSize: 15,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  diaryBody: {
    color: MANGA.ink,
    opacity: 0.85,
    fontSize: 13,
    fontFamily: FONT_FAMILY.mono,
    lineHeight: 19,
  },
  withLabel: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  moreFriends: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  // ── KPI ──
  kpiValue: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  kpiLabel: {
    color: MANGA.ink,
    opacity: 0.65,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  // ── AI note ──
  aiShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  aiBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MANGA.y,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 14,
    gap: 12,
  },
  aiTitle: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  aiText: {
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primary,
    lineHeight: 18,
  },
  aiAccent: {
    color: MANGA.r,
    fontFamily: FONT_FAMILY.primaryBold,
  },
  aiRobot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MANGA.paper,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── hub tile ──
  tile: {
    width: TILE_W as unknown as number,
    aspectRatio: 1.4,
    position: 'relative',
  },
  tileShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  tileBody: {
    flex: 1,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 14,
    justifyContent: 'flex-end',
  },
  tileTitle: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  tileSubtitle: {
    color: MANGA.ink,
    opacity: 0.55,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primary,
    marginTop: 2,
  },
});
