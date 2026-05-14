/**
 * Phase 3 — manga 톤 피드 카드 (Spec §2).
 *
 * 디자인 (WhereHere_Manga.html):
 *   - 카드: 종이 배경 + 잉크 외곽선 2.5px + hard shadow
 *   - 상단: 만화 톤 아바타(이니셜) + 닉네임 + 📍 위치 칩 + 시간 + ··· 메뉴
 *   - 본문 이미지: 잉크 외곽선 프레임 + (선택) 좌상단 어두운 위치칩 오버레이
 *   - 본문 캡션: 1-3줄 미니멀
 *   - 액션바: ❤ 좋아요 / 💬 댓글 / 📤 공유 (Ionicons + ink 색)
 */
import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import {
  MANGA,
  MANGA_BORDER,
  MANGA_RADIUS,
  MANGA_SHADOW_OFFSET,
  FONT_FAMILY,
} from '../../config/theme';
import { MangaAvatar, MangaChip } from '../ui';
import type { CommunityFeedItem, AppleMusicFeedAttachment } from '../../lib/api';
import { FeedAppleMusicCard } from '../music/FeedAppleMusicCard';
import { formatRelativeDate } from '../../utils/format';

const SCREEN_W = Dimensions.get('window').width;
const CARD_HORIZONTAL = 16;
const CARD_W = SCREEN_W - CARD_HORIZONTAL * 2;
const IMAGE_RATIO = 4 / 5;

function buildCaption(item: CommunityFeedItem): string {
  const parts: string[] = [];
  const ans = item.completion_answer?.trim();
  if (ans) parts.push(ans);
  if (!ans && item.mission_blurb?.trim()) {
    parts.push(item.mission_blurb.trim());
  }
  if (!parts.length && item.mission_title?.trim()) {
    parts.push(`「${item.mission_title.trim()}」 미션을 완료했어요.`);
  }
  if (!parts.length && item.event_title?.trim()) {
    parts.push(item.event_title.trim());
  }
  return parts.join('\n\n');
}

function locationLine(item: CommunityFeedItem): string | null {
  const bits = [item.event_district, item.event_address].filter(
    (s): s is string => !!s && String(s).trim().length > 0,
  );
  if (bits.length === 0) return null;
  return bits.slice(0, 2).join(' · ');
}

function parseMusic(raw: unknown): AppleMusicFeedAttachment | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.apple_song_id !== 'string' || typeof o.title !== 'string' || typeof o.artist !== 'string') {
    return null;
  }
  return {
    apple_song_id: o.apple_song_id,
    title: o.title,
    artist: o.artist,
    artwork_url: typeof o.artwork_url === 'string' ? o.artwork_url : null,
    preview_url: typeof o.preview_url === 'string' ? o.preview_url : null,
    apple_music_url: typeof o.apple_music_url === 'string' ? o.apple_music_url : null,
  };
}

interface Props {
  item: CommunityFeedItem;
  onOpenEvent: (id: string) => void;
  onToggleLike: (item: CommunityFeedItem) => void;
  onOpenComments: (item: CommunityFeedItem) => void;
  onShare: (item: CommunityFeedItem) => void;
  onPressAuthor?: (userId: string) => void;
  onPressMore?: (item: CommunityFeedItem) => void;
}

function MangaFeedCardInner({
  item,
  onOpenEvent,
  onToggleLike,
  onOpenComments,
  onShare,
  onPressAuthor,
  onPressMore,
}: Props) {
  const [imgErr, setImgErr] = useState(false);
  const caption = buildCaption(item);
  const loc = locationLine(item);
  const music = parseMusic(item.music_json);
  const canOpen = !!item.event_id;
  const offset = MANGA_SHADOW_OFFSET.md;

  return (
    <View style={[styles.cardWrap, { width: CARD_W }]}>
      {/* hard shadow underlay */}
      <View
        pointerEvents="none"
        style={[styles.shadow, { top: offset, left: offset, width: CARD_W, height: '100%' }]}
      />

      {/* 카드 본체 */}
      <View style={[styles.card, { width: CARD_W }]}>
        {/* ── 상단 author row ── */}
        <View style={styles.headerRow}>
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.avatarImg}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
          ) : (
            <MangaAvatar name={item.username ?? '?'} size={40} />
          )}

          <View style={{ flex: 1, gap: 2 }}>
            <Pressable
              onPress={() => onPressAuthor?.(item.user_id)}
              disabled={!onPressAuthor}
              hitSlop={6}
            >
              <Text style={styles.username} allowFontScaling={false} numberOfLines={1}>
                {item.username ?? '탐험가'}
              </Text>
            </Pressable>
            <View style={styles.metaRow}>
              {loc ? (
                <>
                  <Ionicons name="location" size={12} color={MANGA.r} />
                  <Text style={styles.metaText} allowFontScaling={false} numberOfLines={1}>
                    {loc}
                  </Text>
                  <Text style={styles.metaSep} allowFontScaling={false}>·</Text>
                </>
              ) : null}
              <Text style={styles.metaText} allowFontScaling={false}>
                {formatRelativeDate(item.created_at)}
              </Text>
            </View>
          </View>

          {onPressMore ? (
            <Pressable onPress={() => onPressMore(item)} hitSlop={8} style={styles.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={MANGA.ink} />
            </Pressable>
          ) : null}
        </View>

        {/* ── 이미지 ── */}
        <Pressable
          disabled={!canOpen}
          onPress={() => item.event_id && onOpenEvent(item.event_id)}
          style={styles.imageFrame}
        >
          {/* 이미지 위 좌상단 위치 칩 (loc 가 있을 때) */}
          {loc ? (
            <View style={styles.imageLocChip}>
              <MangaChip
                label={`📍 ${loc.split(' · ')[0]}`}
                tone="ink"
                size="sm"
                borderColor={MANGA.ink}
                borderWidth={2}
              />
            </View>
          ) : null}

          {!imgErr && item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              contentFit="contain"
              transition={220}
              cachePolicy="memory-disk"
              onError={() => setImgErr(true)}
            />
          ) : (
            <View style={styles.imageEmpty}>
              <Ionicons name="image-outline" size={48} color={MANGA.ink} style={{ opacity: 0.35 }} />
              <Text style={styles.imageEmptyText} allowFontScaling={false}>
                이미지를 불러올 수 없어요
              </Text>
            </View>
          )}
        </Pressable>

        {/* ── 본문 ── */}
        {caption ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
            <Text style={styles.caption} allowFontScaling={false} numberOfLines={4}>
              {caption}
            </Text>
          </View>
        ) : null}

        {/* ── Apple Music ── */}
        {music ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
            <FeedAppleMusicCard music={music} />
          </View>
        ) : null}

        {/* ── 액션바 ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => onToggleLike(item)}
            hitSlop={8}
          >
            <Ionicons
              name={item.liked_by_me ? 'heart' : 'heart-outline'}
              size={22}
              color={item.liked_by_me ? MANGA.r : MANGA.ink}
            />
            {item.like_count > 0 ? (
              <Text style={[styles.actionCount, item.liked_by_me && { color: MANGA.r }]} allowFontScaling={false}>
                {item.like_count}
              </Text>
            ) : null}
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => onOpenComments(item)}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={MANGA.ink} />
            {item.comment_count > 0 ? (
              <Text style={styles.actionCount} allowFontScaling={false}>
                {item.comment_count}
              </Text>
            ) : null}
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => onShare(item)}
            hitSlop={8}
          >
            <Ionicons name="paper-plane-outline" size={20} color={MANGA.ink} />
          </Pressable>

          {/* "이 장소 가기" chip — canOpen 일 때 우측 정렬 */}
          {canOpen ? (
            <Pressable
              onPress={() => item.event_id && onOpenEvent(item.event_id)}
              style={{ marginLeft: 'auto' }}
              hitSlop={6}
            >
              <MangaChip
                label="이 장소 가기 ›"
                tone="yellow"
                size="md"
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 8,
  },
  shadow: {
    position: 'absolute',
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  card: {
    backgroundColor: MANGA.paper,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: MANGA.b,
  },
  username: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: MANGA.ink,
    opacity: 0.6,
    fontSize: 11,
    fontFamily: FONT_FAMILY.primary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  metaSep: {
    color: MANGA.ink,
    opacity: 0.4,
    fontSize: 11,
  },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFrame: {
    width: '100%',
    aspectRatio: IMAGE_RATIO,
    borderTopWidth: MANGA_BORDER.width,
    borderBottomWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    backgroundColor: '#FFEFD0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: MANGA.paper2,
  },
  imageEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageEmptyText: {
    color: MANGA.ink,
    opacity: 0.5,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primary,
  },
  imageLocChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  caption: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primary,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    color: MANGA.ink,
    fontSize: 13,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});

export const MangaFeedCard = memo(MangaFeedCardInner);
